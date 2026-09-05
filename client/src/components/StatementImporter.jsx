import { useState, useRef } from 'react'
import { UploadCloud, FileText, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

// Pre-packaged realistic sample statement for instant 1-click testing
const SAMPLE_STATEMENT_CSV = `transaction_id,date,time,description,payee,amount,channel
TXN-SMP-001,2024-01-05,10:14:02,Office Depot Equipment,Office_Supplies_Inc,124.50,card
TXN-SMP-002,2024-01-08,14:22:15,Monthly SaaS Suite,Cloud_Workspace,45.00,netbanking
TXN-SMP-003,2024-01-12,11:05:40,Client Business Lunch,Bistro_Central,88.20,card
TXN-SMP-004,2024-01-15,16:30:11,High-Speed Fiber Internet,Metro_Telecom,75.00,card
TXN-SMP-005,2024-01-19,09:45:00,Building Maintenance Fee,Property_Mgmt,250.00,netbanking
TXN-SMP-006,2024-01-24,13:12:30,Stationery & Printing,City_Print_Shop,34.00,UPI
TXN-SMP-007,2024-02-02,10:50:18,Monthly SaaS Suite,Cloud_Workspace,45.00,netbanking
TXN-SMP-008,2024-02-06,12:15:00,Client Dinner,Grand_Hotel,142.00,card
TXN-SMP-009,2024-02-14,15:40:22,Courier & Freight,Express_Postal,28.50,UPI
TXN-SMP-010,2024-02-20,11:25:35,Office Refreshments,Coffee_Supply_Co,65.00,card
TXN-SMP-011,2024-03-01,10:05:12,Monthly SaaS Suite,Cloud_Workspace,45.00,netbanking
TXN-SMP-012,2024-03-08,14:18:40,IT Hardware Maintenance,Tech_Support_Ltd,180.00,netbanking
TXN-SMP-013,2024-03-15,09:30:00,Local Courier Logistics,Express_Postal,32.00,UPI
TXN-SMP-014,2024-03-22,16:45:20,Team Catering,Corner_Bakery,95.00,card
TXN-SMP-015,2024-04-02,11:10:05,Monthly SaaS Suite,Cloud_Workspace,45.00,netbanking
TXN-SMP-016,2024-04-12,15:20:10,Office Utilities,City_Power,110.00,netbanking
TXN-SMP-017,2024-04-20,02:45:12,Urgent Wire Settlement,Unknown_Offshore_Payee,8900.00,netbanking
TXN-SMP-018,2024-04-21,03:15:40,Rapid Express Payout,Unknown_Offshore_Payee,7450.00,netbanking
TXN-SMP-019,2024-04-22,03:35:18,Second Tranche Liquidation,Unknown_Offshore_Payee,9200.00,netbanking
`

export default function StatementImporter({ onStatementIngested }) {
  const [file, setFile] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setError('')
    }
  }

  const uploadStatement = async (statementBlob, fileName, customName) => {
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', statementBlob, fileName)
      if (customName) {
        formData.append('customer_name', customName)
      }

      const res = await fetch(`${API}/api/ingest/statement`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const cType = res.headers.get('content-type') || ''
        let msg = `Upload failed with status ${res.status}`
        if (cType.includes('application/json')) {
          const errData = await res.json().catch(() => ({}))
          msg = errData.detail || msg
        }
        throw new Error(msg)
      }

      const data = await res.json()
      if (onStatementIngested) {
        onStatementIngested(data.customer_id, data.report)
      }
    } catch (err) {
      setError(err.message || 'Failed to ingest bank statement.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a CSV bank statement to upload.')
      return
    }
    uploadStatement(file, file.name, accountName)
  }

  const handleLoadSample = () => {
    const sampleBlob = new Blob([SAMPLE_STATEMENT_CSV], { type: 'text/csv' })
    uploadStatement(sampleBlob, 'Sample_Commercial_Statement.csv', 'Sample Commercial Account — Burst Anomaly')
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <div className="card" style={{ padding: 32 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius)',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}>
            <UploadCloud size={28} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Universal Bank Statement Ingestion
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 520, margin: '6px auto 0 auto' }}>
            Upload real bank statements in any CSV structure (Chase, Barclays, HDFC, Revolut). Our smart parser normalizes columns, computes the diurnal baseline, and flags anomalies in seconds.
          </p>
        </div>

        {/* 1-Click Quick Demo Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid var(--accent-light)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--accent)" />
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No statement on hand?</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>Test with our verified multi-month commercial statement.</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleLoadSample}
            disabled={uploading}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--accent)',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap',
            }}
          >
            Load Sample Statement
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              background: isDragOver ? 'var(--accent-light)' : 'var(--bg)',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <FileText size={32} color={file ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 10px auto', display: 'block' }} />
            {file ? (
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Ready for ingestion
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drag and drop bank statement CSV here
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  or click to select from your computer (UTF-8, comma or tab delimited)
                </p>
              </div>
            )}
          </div>

          {/* Optional account label */}
          <div style={{ marginBottom: 20 }}>
            <label className="field-label" htmlFor="account-name-input">
              Account / Subject Label (Optional)
            </label>
            <input
              id="account-name-input"
              type="text"
              className="styled-select"
              placeholder="e.g. Acme Corp — Primary Operating Account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={uploading}
              style={{ width: '100%', cursor: 'text' }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              fontSize: 13, color: 'var(--danger)', marginBottom: 20,
            }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={!file || uploading}
            style={{ width: '100%', padding: '13px 24px', fontSize: 15, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#FFFFFF' }} />
                Normalizing & Profiling Statement…
              </>
            ) : (
              <>
                Ingest & Run Risk Audit
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Technical specs notice */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Zero PII Retention</strong>
            Account numbers sanitized
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Auto-Header Mapping</strong>
            Detects Date, Amount, Payee
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>&ge; 15 Record Rule</strong>
            Defensible statistical baseline
          </div>
        </div>
      </div>
    </div>
  )
}
