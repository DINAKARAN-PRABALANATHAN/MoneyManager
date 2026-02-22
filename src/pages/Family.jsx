import { useState } from 'react'
import { useFamily } from '../hooks/useFamily'
import { useAuth } from '../context/AuthContext'

export default function Family() {
  const { user } = useAuth()
  const { 
    family, pendingInvites, loading, isOwner,
    createFamily, createInviteCode, joinWithCode,
    removeMember, leaveFamily, deleteFamily 
  } = useFamily()

  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [joining, setJoining] = useState(false)

  const showMessage = (msg, isError = false) => {
    setMessage({ text: msg, isError })
    setTimeout(() => setMessage(''), 5000)
  }

  const handleCreateFamily = async (e) => {
    e.preventDefault()
    if (!familyName.trim()) return
    
    setCreating(true)
    try {
      await createFamily(familyName.trim())
      setFamilyName('')
      showMessage('Family created!')
    } catch (error) {
      showMessage(error.message, true)
    }
    setCreating(false)
  }

  const handleGenerateCode = async () => {
    setGeneratingCode(true)
    try {
      const code = await createInviteCode()
      setGeneratedCode(code)
      showMessage('Invite code generated! Share it with family members.')
    } catch (error) {
      showMessage(error.message, true)
    }
    setGeneratingCode(false)
  }

  const handleJoinWithCode = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    
    setJoining(true)
    try {
      await joinWithCode(joinCode.trim())
      setJoinCode('')
      showMessage('Joined family successfully!')
    } catch (error) {
      showMessage(error.message, true)
    }
    setJoining(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    showMessage('Code copied to clipboard!')
  }

  const shareCode = () => {
    const text = `Join my family "${family.name}" on Money Manager!\n\nUse this code: ${generatedCode}\n\nDownload the app and enter this code to join.`
    if (navigator.share) {
      navigator.share({ title: 'Family Invite', text })
    } else {
      navigator.clipboard.writeText(text)
      showMessage('Invite message copied!')
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (confirm(`Remove ${memberName} from family?`)) {
      try {
        await removeMember(memberId)
        showMessage('Member removed')
      } catch (error) {
        showMessage(error.message, true)
      }
    }
  }

  const handleLeaveFamily = async () => {
    if (confirm('Leave this family? You will no longer see shared transactions.')) {
      try {
        await leaveFamily()
        showMessage('Left family')
      } catch (error) {
        showMessage(error.message, true)
      }
    }
  }

  const handleDeleteFamily = async () => {
    if (confirm('Delete this family? All members will be removed.')) {
      try {
        await deleteFamily()
        showMessage('Family deleted')
      } catch (error) {
        showMessage(error.message, true)
      }
    }
  }

  if (loading) {
    return <div className="container"><div className="card">Loading...</div></div>
  }

  return (
    <div className="container">
      {message && (
        <div style={{ 
          padding: 12, marginBottom: 16, borderRadius: 8, 
          background: message.isError ? '#fef2f2' : '#ecfdf5', 
          color: message.isError ? '#ef4444' : '#10b981' 
        }}>
          {message.text}
        </div>
      )}

      {/* No Family - Create or Join */}
      {!family && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>👨‍👩‍👧‍👦 Family Sharing</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              Create a family group or join an existing one to share transactions with family members.
            </p>
            
            <h3 style={{ marginBottom: 12 }}>Create New Family</h3>
            <form onSubmit={handleCreateFamily}>
              <div className="form-group">
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Enter family name (e.g., Smith Family)"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create Family'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Join Existing Family</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>
              Have an invite code? Enter it below to join a family.
            </p>
            <form onSubmit={handleJoinWithCode}>
              <div className="add-option">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 10-character code"
                  maxLength={10}
                  style={{ textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, textAlign: 'center' }}
                  required
                />
                <button type="submit" className="btn btn-success" disabled={joining}>
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Has Family */}
      {family && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>👨‍👩‍👧‍👦 {family.name}</h2>
              {isOwner && <span style={{ background: '#4f46e5', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>Owner</span>}
            </div>

            {/* Owner Info */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: '#6b7280' }}>Owner</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                  {family.ownerName?.charAt(0) || '?'}
                </div>
                <div>
                  <strong>{family.ownerName}</strong>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{family.ownerEmail}</p>
                </div>
              </div>
            </div>

            {/* Members */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: '#6b7280' }}>Members ({family.members?.length || 0})</h4>
              {family.members?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {family.members.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                            {member.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <strong>{member.name}</strong>
                          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{member.email}</p>
                        </div>
                      </div>
                      {isOwner && (
                        <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleRemoveMember(member.id, member.name)}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', padding: 20, textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>
                  No members yet. Generate an invite code below.
                </p>
              )}
            </div>

            {/* Invite Code (Owner only) */}
            {isOwner && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
                <h4 style={{ marginBottom: 12 }}>Invite Members</h4>
                
                {generatedCode ? (
                  <div style={{ background: '#ecfdf5', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                    <p style={{ marginBottom: 8, color: '#6b7280' }}>Share this code with family members:</p>
                    <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 8, color: '#10b981', marginBottom: 16 }}>
                      {generatedCode}
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Code expires in 7 days</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn-primary" onClick={copyCode}>📋 Copy Code</button>
                      <button className="btn btn-success" onClick={shareCode}>📤 Share</button>
                      <button className="btn" onClick={handleGenerateCode}>🔄 New Code</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#6b7280', marginBottom: 12 }}>
                      Generate a code to share with family members via WhatsApp, SMS, or any other way.
                    </p>
                    <button className="btn btn-primary" onClick={handleGenerateCode} disabled={generatingCode}>
                      {generatingCode ? 'Generating...' : '🔑 Generate Invite Code'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Leave/Delete Family */}
          <div className="card" style={{ border: '1px solid #fecaca' }}>
            <h4 style={{ marginBottom: 12, color: '#dc2626' }}>⚠️ Danger Zone</h4>
            {isOwner ? (
              <div>
                <p style={{ color: '#6b7280', marginBottom: 12 }}>
                  Deleting the family will remove all members and stop sharing.
                </p>
                <button className="btn btn-danger" onClick={handleDeleteFamily}>
                  Delete Family
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', marginBottom: 12 }}>
                  Leave this family to stop sharing transactions.
                </p>
                <button className="btn btn-danger" onClick={handleLeaveFamily}>
                  Leave Family
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
