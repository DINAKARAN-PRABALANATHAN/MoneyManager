import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from '../firebase'
import { 
  collection, addDoc, query, where, getDocs, updateDoc, 
  doc, onSnapshot, arrayUnion, arrayRemove, deleteDoc 
} from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { sendFamilyInviteEmail } from '../utils/email'

export function useFamily() {
  const { user } = useAuth()
  const [family, setFamily] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)

  // Load user's family
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadFamily = async () => {
      // Check if user is owner of a family
      const ownerQuery = query(collection(db, 'families'), where('ownerId', '==', user.uid))
      const ownerSnapshot = await getDocs(ownerQuery)
      
      if (!ownerSnapshot.empty) {
        const familyDoc = ownerSnapshot.docs[0]
        setFamily({ id: familyDoc.id, ...familyDoc.data() })
        setLoading(false)
        return
      }

      // Check if user is member of a family
      const memberQuery = query(collection(db, 'families'), where('memberIds', 'array-contains', user.uid))
      const memberSnapshot = await getDocs(memberQuery)
      
      if (!memberSnapshot.empty) {
        const familyDoc = memberSnapshot.docs[0]
        setFamily({ id: familyDoc.id, ...familyDoc.data() })
      }
      
      setLoading(false)
    }

    loadFamily()
  }, [user])

  // Subscribe to family updates
  useEffect(() => {
    if (!family?.id) return

    const unsubscribe = onSnapshot(doc(db, 'families', family.id), (doc) => {
      if (doc.exists()) {
        setFamily({ id: doc.id, ...doc.data() })
      } else {
        setFamily(null)
      }
    })

    return unsubscribe
  }, [family?.id])

  // Load pending invites for current user
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'familyInvites'),
      where('inviteeEmail', '==', user.email),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    return unsubscribe
  }, [user])

  // Create a new family
  const createFamily = useCallback(async (familyName) => {
    if (!user) throw new Error('Not authenticated')
    if (family) throw new Error('Already in a family')

    const familyDoc = await addDoc(collection(db, 'families'), {
      name: familyName,
      ownerId: user.uid,
      ownerEmail: user.email,
      ownerName: user.displayName,
      memberIds: [],
      members: [],
      createdAt: new Date().toISOString()
    })

    setFamily({ id: familyDoc.id, name: familyName, ownerId: user.uid, memberIds: [], members: [] })
  }, [user, family])

  // Generate secure random invite code (10 characters)
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars: 0,O,1,I
    let code = ''
    const array = new Uint8Array(10)
    crypto.getRandomValues(array)
    for (let i = 0; i < 10; i++) {
      code += chars[array[i] % chars.length]
    }
    return code
  }

  // Create invite code (instead of email)
  const createInviteCode = useCallback(async () => {
    if (!user || !family) throw new Error('No family')
    if (family.ownerId !== user.uid) throw new Error('Only owner can create invite')

    const code = generateInviteCode()
    
    await addDoc(collection(db, 'familyInvites'), {
      familyId: family.id,
      familyName: family.name,
      inviterId: user.uid,
      inviterName: user.displayName,
      inviteCode: code,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })

    return code
  }, [user, family])

  // Join family using invite code
  const joinWithCode = useCallback(async (code) => {
    if (!user) throw new Error('Not authenticated')
    if (family) throw new Error('Already in a family')

    const q = query(
      collection(db, 'familyInvites'),
      where('inviteCode', '==', code.toUpperCase()),
      where('status', '==', 'pending')
    )
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) throw new Error('Invalid or expired code')
    
    const invite = snapshot.docs[0]
    const inviteData = invite.data()
    
    // Check if expired
    if (new Date(inviteData.expiresAt) < new Date()) {
      throw new Error('Invite code has expired')
    }

    // Add user to family
    await updateDoc(doc(db, 'families', inviteData.familyId), {
      memberIds: arrayUnion(user.uid),
      members: arrayUnion({
        id: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        joinedAt: new Date().toISOString()
      })
    })

    // Mark invite as used
    await updateDoc(doc(db, 'familyInvites', invite.id), {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: new Date().toISOString()
    })

    // Load the family
    const familyDoc = await getDocs(query(collection(db, 'families'), where('__name__', '==', inviteData.familyId)))
    if (!familyDoc.empty) {
      setFamily({ id: familyDoc.docs[0].id, ...familyDoc.docs[0].data() })
    }
  }, [user, family])

  // Invite member by email
  const inviteMember = useCallback(async (email) => {
    if (!user || !family) throw new Error('No family')
    if (family.ownerId !== user.uid) throw new Error('Only owner can invite')
    if (email === user.email) throw new Error('Cannot invite yourself')

    // Check if already invited
    const existingQuery = query(
      collection(db, 'familyInvites'),
      where('familyId', '==', family.id),
      where('inviteeEmail', '==', email),
      where('status', '==', 'pending')
    )
    const existing = await getDocs(existingQuery)
    if (!existing.empty) throw new Error('Already invited')

    // Check if already a member
    if (family.members?.some(m => m.email === email)) {
      throw new Error('Already a member')
    }

    await addDoc(collection(db, 'familyInvites'), {
      familyId: family.id,
      familyName: family.name,
      inviterId: user.uid,
      inviterName: user.displayName,
      inviterEmail: user.email,
      inviteeEmail: email.toLowerCase(),
      status: 'pending',
      createdAt: new Date().toISOString()
    })

    // Try to send email notification
    await sendFamilyInviteEmail(email, user.displayName, family.name)
  }, [user, family])

  // Accept invite
  const acceptInvite = useCallback(async (inviteId) => {
    if (!user) throw new Error('Not authenticated')

    const invite = pendingInvites.find(i => i.id === inviteId)
    if (!invite) throw new Error('Invite not found')

    // Add user to family
    await updateDoc(doc(db, 'families', invite.familyId), {
      memberIds: arrayUnion(user.uid),
      members: arrayUnion({
        id: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        joinedAt: new Date().toISOString()
      })
    })

    // Update invite status
    await updateDoc(doc(db, 'familyInvites', inviteId), {
      status: 'accepted'
    })

    // Load the family
    const familyDoc = await getDocs(query(collection(db, 'families'), where('__name__', '==', invite.familyId)))
    if (!familyDoc.empty) {
      setFamily({ id: familyDoc.docs[0].id, ...familyDoc.docs[0].data() })
    }
  }, [user, pendingInvites])

  // Decline invite
  const declineInvite = useCallback(async (inviteId) => {
    await updateDoc(doc(db, 'familyInvites', inviteId), {
      status: 'declined'
    })
  }, [])

  // Remove member (owner only)
  const removeMember = useCallback(async (memberId) => {
    if (!user || !family) throw new Error('No family')
    if (family.ownerId !== user.uid) throw new Error('Only owner can remove members')

    const memberToRemove = family.members?.find(m => m.id === memberId)
    if (!memberToRemove) throw new Error('Member not found')

    await updateDoc(doc(db, 'families', family.id), {
      memberIds: arrayRemove(memberId),
      members: arrayRemove(memberToRemove)
    })
  }, [user, family])

  // Leave family (member only)
  const leaveFamily = useCallback(async () => {
    if (!user || !family) throw new Error('No family')
    if (family.ownerId === user.uid) throw new Error('Owner cannot leave, delete family instead')

    const currentMember = family.members?.find(m => m.id === user.uid)
    
    await updateDoc(doc(db, 'families', family.id), {
      memberIds: arrayRemove(user.uid),
      members: arrayRemove(currentMember)
    })

    setFamily(null)
  }, [user, family])

  // Delete family (owner only)
  const deleteFamily = useCallback(async () => {
    if (!user || !family) throw new Error('No family')
    if (family.ownerId !== user.uid) throw new Error('Only owner can delete family')

    // Delete all pending invites
    const invitesQuery = query(collection(db, 'familyInvites'), where('familyId', '==', family.id))
    const invites = await getDocs(invitesQuery)
    await Promise.all(invites.docs.map(d => deleteDoc(doc(db, 'familyInvites', d.id))))

    // Delete family
    await deleteDoc(doc(db, 'families', family.id))
    setFamily(null)
  }, [user, family])

  // Get all family member IDs (including owner)
  const familyMemberIds = useMemo(() => {
    if (!family) return user ? [user.uid] : []
    return [family.ownerId, ...(family.memberIds || [])]
  }, [family, user])

  return useMemo(() => ({
    family,
    familyMemberIds,
    pendingInvites,
    loading,
    isOwner: family?.ownerId === user?.uid,
    createFamily,
    createInviteCode,
    joinWithCode,
    inviteMember,
    acceptInvite,
    declineInvite,
    removeMember,
    leaveFamily,
    deleteFamily
  }), [family, familyMemberIds, pendingInvites, loading, user, createFamily, createInviteCode, joinWithCode, inviteMember, acceptInvite, declineInvite, removeMember, leaveFamily, deleteFamily])
}
