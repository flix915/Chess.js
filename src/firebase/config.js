import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore'

const firebaseConfig = {
    apikey: 'AIzaSyDdmMQYDq2MLySRdHo_06uzSXW5179X2l8',
    authDomain:'projeto-xadrez.firebaseapp.com',
    projectid:'projeto-xadrez',
    storageBucket:'projeto-xadrez.firebasestorage.app',
    messaginSenderId:'56744624764',
    appId:'1:56744624764:web:a50f49fe3b42fc1a233ff9',

}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
