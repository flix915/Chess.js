import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from 'firebase/auth'
import { auth } from '../firebase/config'

export async function registerUser(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(userCredential.user, { displayName })
  return userCredential.user
}

export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

export async function logoutUser() {
  await signOut(auth)
}

export function listenAuthState(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function removeCurrentUser() {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Nenhum usuário autenticado')
  }
  await deleteUser(user)
}
