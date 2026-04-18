import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export async function saveUserProfile(uid, profile) {
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, profile, { merge: true })
}

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid)
  const docSnap = await getDoc(userRef)
  return docSnap.exists() ? docSnap.data() : null
}

export async function saveGameResult(uid, gameData) {
  const gamesRef = collection(db, 'games')
  await addDoc(gamesRef, {
    uid,
    ...gameData,
    createdAt: new Date().toISOString(),
  })
}

export async function getUserGames(uid) {
  const gamesRef = collection(db, 'games')
  const q = query(gamesRef, where('uid', '==', uid))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }))
}

export async function deleteGameRecord(gameId) {
  const gameRef = doc(db, 'games', gameId)
  await deleteDoc(gameRef)
}

export async function deleteUserData(uid) {
  const userRef = doc(db, 'users', uid)
  await deleteDoc(userRef)

  const games = await getUserGames(uid)
  await Promise.all(games.map((game) => deleteGameRecord(game.id)))
}