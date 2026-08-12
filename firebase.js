import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";


import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


"use strict";


/*
==================================================
FIREBASE CONFIGURATION
==================================================

Conversate Pro uses the SAME Firebase project
and SAME account_Details collection as LingoGPT.

Existing LingoGPT users can therefore login
with the same username and password.

Conversate Pro data is stored separately inside:

conversate_Data

LingoGPT continues using:

lingo_Data
==================================================
*/

const firebaseConfig = {
  apiKey:
    "AIzaSyDVh4UFpUIGLIDllXgB4V03PPHncg6llIA",

  authDomain:
    "two-todolist-project.firebaseapp.com",

  projectId:
    "two-todolist-project",

  storageBucket:
    "two-todolist-project.firebasestorage.app",

  messagingSenderId:
    "981585696379",

  appId:
    "1:981585696379:web:fcd35ed7176c86c64ef4de"
};


const app =
  initializeApp(
    firebaseConfig
  );


const database =
  getFirestore(app);



/*
==================================================
FIRESTORE COLLECTIONS
==================================================

account_Details
    |
    └── user_xxx
          name
          username
          email
          password
          user_idx
          ...


lingo_Data
    |
    └── Used by LingoGPT


conversate_Data
    |
    └── user_xxx
          user_idx
          username
          rooms: []
          updatedAt

==================================================
*/

const COLLECTIONS = {

  accounts:
    "account_Details",

  conversate:
    "conversate_Data"

};



/*
==================================================
LOCAL STORAGE
==================================================

ACCOUNT KEYS
------------

These intentionally stay compatible
with your existing LingoGPT account system.

CONVERSATE KEYS
---------------

Conversate Pro application data uses
different keys so it does not overwrite
LingoGPT rooms and conversations.
==================================================
*/

const STORAGE_KEYS = {

  /*
  Shared account information
  */

  users:
    "lingo_user_details",

  session:
    "lingo_logged_in_user",

  account:
    "account_details",

  savedLogin:
    "saved_login_details",


  /*
  Conversate Pro application data
  */

  data:
    "conversate_user_data",

  currentRoom:
    "conversate_current_room",


  /*
  Temporary learning tools.

  These WILL NOT be saved to Firestore.
  */

  options:
    "conversate_options",

  teach:
    "conversate_teach"

};



/*
==================================================
GENERAL HELPERS
==================================================
*/

function createId(
  prefix
) {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.floor(
      Math.random() * 10000
    )
  );

}


function clone(
  value
) {

  return JSON.parse(
    JSON.stringify(
      value
    )
  );

}



function showMessage(
  message,
  type
) {

  /*
  loginregister.html can provide:

  window.showAuthMessage(...)
  */

  if (
    typeof window.showAuthMessage ===
    "function"
  ) {

    window.showAuthMessage(
      message,
      type
    );

    return;

  }


  console.log(
    type || "message",
    message
  );

}



/*
==================================================
LOCAL STORAGE OBJECT HELPER
==================================================
*/

function readObject(
  key
) {

  try {

    const value =
      JSON.parse(
        localStorage.getItem(
          key
        ) || "{}"
      );


    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {

      return value;

    }


    return {};


  } catch (error) {

    console.warn(
      "Invalid localStorage object:",
      key,
      error
    );


    return {};

  }

}



/*
==================================================
SESSION
==================================================
*/

function getSessionUserIdx() {

  return (
    localStorage.getItem(
      STORAGE_KEYS.session
    ) || ""
  );

}



function getCurrentRoomIdx() {

  return (
    localStorage.getItem(
      STORAGE_KEYS.currentRoom
    ) || ""
  );

}



/*
==================================================
SAVE ACCOUNT LOCALLY
==================================================
*/

function saveLocalAccount(
  account
) {

  /*
  Do NOT place the password inside
  the normal local account cache.
  */

  const safeAccount = {

    user_idx:
      account.user_idx,

    username:
      account.username,

    name:
      account.name || "",

    email:
      account.email || "",

    website:
      account.website || "",

    experience:
      account.experience || 0,

    profile_pic:
      account.profile_pic || "",

    cv:
      account.cv || ""

  };


  /*
  Existing pages expect this
  value as an array.
  */

  localStorage.setItem(

    STORAGE_KEYS.users,

    JSON.stringify([
      safeAccount
    ])

  );


  localStorage.setItem(

    STORAGE_KEYS.account,

    JSON.stringify(
      safeAccount
    )

  );


  /*
  Remember only username for
  login form convenience.
  */

  localStorage.setItem(

    STORAGE_KEYS.savedLogin,

    JSON.stringify({

      username:
        safeAccount.username

    })

  );

}



/*
==================================================
SAVE CONVERSATE DATA LOCALLY
==================================================
*/

function saveLocalConversateData(
  userData
) {

  /*
  Kept as an array to remain similar
  to the original LingoGPT structure.
  */

  localStorage.setItem(

    STORAGE_KEYS.data,

    JSON.stringify([
      userData
    ])

  );

}



/*
==================================================
SAVE LOGIN SESSION
==================================================
*/

function saveSession(
  account
) {

  localStorage.setItem(

    STORAGE_KEYS.session,

    account.user_idx

  );


  saveLocalAccount(
    account
  );

}



/*
==================================================
CLEAR TEMPORARY LEARNING DATA
==================================================
*/

function clearTemporaryData() {

  localStorage.removeItem(
    STORAGE_KEYS.options
  );


  localStorage.removeItem(
    STORAGE_KEYS.teach
  );

}



/*
==================================================
CLEAR SESSION
==================================================
*/

function clearSession() {

  localStorage.removeItem(
    STORAGE_KEYS.session
  );


  localStorage.removeItem(
    STORAGE_KEYS.currentRoom
  );


  localStorage.removeItem(
    STORAGE_KEYS.account
  );


  localStorage.removeItem(
    STORAGE_KEYS.users
  );


  localStorage.removeItem(
    STORAGE_KEYS.data
  );


  clearTemporaryData();

}



/*
==================================================
CLEAR TEMPORARY DATA FOR ONE ROOM
==================================================

options.js and teach.js will later save data like:

{
  "room_123": {...},
  "room_456": {...}
}

If a room is deleted we remove only that
room's temporary information.
==================================================
*/

function clearTemporaryRoomData(
  roomIdx
) {

  const keys = [

    STORAGE_KEYS.options,
    STORAGE_KEYS.teach

  ];


  keys.forEach(
    function(key) {

      const value =
        readObject(
          key
        );


      if (
        Object.prototype.hasOwnProperty.call(
          value,
          roomIdx
        )
      ) {

        delete value[
          roomIdx
        ];


        localStorage.setItem(

          key,

          JSON.stringify(
            value
          )

        );

      }

    }
  );

}



/*
==================================================
FIND ACCOUNT BY USERNAME
==================================================
*/

async function findAccountByUsername(
  username
) {

  const accountQuery =
    query(

      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "username",
        "==",
        username
      ),

      limit(1)

    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (
    snapshot.empty
  ) {

    return null;

  }


  const document =
    snapshot.docs[0];


  return {

    documentId:
      document.id,

    ...document.data()

  };

}



/*
==================================================
FIND ACCOUNT BY EMAIL
==================================================
*/

async function findAccountByEmail(
  email
) {

  const accountQuery =
    query(

      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "email",
        "==",
        email
      ),

      limit(1)

    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (
    snapshot.empty
  ) {

    return null;

  }


  const document =
    snapshot.docs[0];


  return {

    documentId:
      document.id,

    ...document.data()

  };

}



/*
==================================================
FIND ACCOUNT BY USER IDX
==================================================
*/

async function findAccountByUserIdx(
  userIdx
) {

  /*
  First try user_idx directly
  as the Firestore document ID.
  */

  const directReference =
    doc(

      database,

      COLLECTIONS.accounts,

      userIdx

    );


  const directSnapshot =
    await getDoc(
      directReference
    );


  if (
    directSnapshot.exists()
  ) {

    return {

      documentId:
        directSnapshot.id,

      ...directSnapshot.data()

    };

  }


  /*
  Support old accounts whose
  Firestore document ID may be
  different from user_idx.
  */

  const accountQuery =
    query(

      collection(
        database,
        COLLECTIONS.accounts
      ),

      where(
        "user_idx",
        "==",
        userIdx
      ),

      limit(1)

    );


  const snapshot =
    await getDocs(
      accountQuery
    );


  if (
    snapshot.empty
  ) {

    return null;

  }


  const document =
    snapshot.docs[0];


  return {

    documentId:
      document.id,

    ...document.data()

  };

}



/*
==================================================
REGISTER USER
==================================================

IMPORTANT:

This uses the same tutorial account system
as your original LingoGPT.

For a public production application we should
later change this to Firebase Authentication.

For now this preserves compatibility with
your existing users.
==================================================
*/

async function registerUser(
  details
) {

  const name =
    String(
      details.name || ""
    ).trim();


  const username =
    String(
      details.username || ""
    ).trim();


  const email =
    String(
      details.email || ""
    ).trim();


  const password =
    String(
      details.password || ""
    );


  /*
  ------------------------------
  Validation
  ------------------------------
  */

  if (
    !name ||
    !username ||
    !email ||
    !password
  ) {

    throw new Error(
      "Complete all registration fields."
    );

  }



  /*
  ------------------------------
  Check username
  ------------------------------
  */

  const existingUsername =
    await findAccountByUsername(
      username
    );


  if (
    existingUsername
  ) {

    throw new Error(
      "That username already exists. Login with the existing account instead."
    );

  }



  /*
  ------------------------------
  Check email
  ------------------------------
  */

  const existingEmail =
    await findAccountByEmail(
      email
    );


  if (
    existingEmail
  ) {

    throw new Error(
      "An account already uses that email. Login with the existing account instead."
    );

  }



  /*
  ------------------------------
  Generate user ID
  ------------------------------
  */

  const userIdx =
    createId(
      "user"
    );



  /*
  ------------------------------
  Account document
  ------------------------------
  */

  const accountData = {

    name:
      name,

    email:
      email,

    username:
      username,


    /*
    Tutorial compatibility only.
    */

    password:
      password,


    user_idx:
      userIdx,

    website:
      "",

    experience:
      0,

    profile_pic:
      "",

    cv:
      "",

    createdAt:
      new Date()
        .toISOString()

  };



  /*
  Save shared account.
  */

  await setDoc(

    doc(

      database,

      COLLECTIONS.accounts,

      userIdx

    ),

    accountData

  );



  /*
  ------------------------------
  Conversate Pro document
  ------------------------------
  */

  const conversateData = {

    user_idx:
      userIdx,

    username:
      username,

    rooms:
      [],

    updatedAt:
      new Date()
        .toISOString()

  };



  await setDoc(

    doc(

      database,

      COLLECTIONS.conversate,

      userIdx

    ),

    conversateData

  );



  /*
  Save browser session.
  */

  saveSession(
    accountData
  );


  saveLocalConversateData(
    conversateData
  );


  return accountData;

}



/*
==================================================
LOGIN USER
==================================================

Existing LingoGPT accounts work because
we search the exact same account_Details
collection.
==================================================
*/

async function loginUser(
  username,
  password
) {

  username =
    String(
      username || ""
    ).trim();


  password =
    String(
      password || ""
    );


  if (
    !username ||
    !password
  ) {

    throw new Error(
      "Enter your username and password."
    );

  }



  const account =
    await findAccountByUsername(
      username
    );


  if (
    !account
  ) {

    throw new Error(
      "Username was not found."
    );

  }



  /*
  Same educational password check
  as the original project.
  */

  if (
    String(
      account.password
    ) !== password
  ) {

    throw new Error(
      "Password is incorrect."
    );

  }



  const userIdx =

    account.user_idx ||

    account.documentId;



  account.user_idx =
    userIdx;



  /*
  Create session.
  */

  saveSession(
    account
  );



  /*
  Load Conversate Pro data.

  If this is an existing LingoGPT user
  using Conversate Pro for the first time,
  loadUserData() automatically creates
  conversate_Data for them.
  */

  await loadUserData(
    userIdx
  );


  return account;

}



/*
==================================================
LOAD USER CONVERSATE DATA
==================================================
*/

async function loadUserData(
  userIdx = getSessionUserIdx()
) {

  if (
    !userIdx
  ) {

    return null;

  }



  const reference =
    doc(

      database,

      COLLECTIONS.conversate,

      userIdx

    );



  const snapshot =
    await getDoc(
      reference
    );



  /*
  ==================================================
  FIRST TIME USING CONVERSATE PRO

  Account exists in account_Details,
  but conversate_Data does not exist yet.
  ==================================================
  */

  if (
    !snapshot.exists()
  ) {

    const account =
      await findAccountByUserIdx(
        userIdx
      );


    if (
      !account
    ) {

      return null;

    }



    const initialData = {

      user_idx:
        userIdx,

      username:
        account.username,

      rooms:
        [],

      updatedAt:
        new Date()
          .toISOString()

    };



    await setDoc(

      reference,

      initialData

    );



    saveLocalConversateData(
      initialData
    );


    return initialData;

  }



  /*
  Existing Conversate Pro user.
  */

  const data =
    snapshot.data();



  if (
    !Array.isArray(
      data.rooms
    )
  ) {

    data.rooms =
      [];

  }



  saveLocalConversateData(
    data
  );


  return data;

}



/*
==================================================
SAVE COMPLETE CONVERSATE USER DATA
==================================================

Current structure:

conversate_Data
   |
   └── user_idx
         |
         └── rooms[]
               |
               └── room_data[]

Same simple architecture as LingoGPT.
==================================================
*/

async function saveUserData(
  userData
) {

  if (
    !userData ||
    !userData.user_idx
  ) {

    throw new Error(
      "Cannot save user data."
    );

  }



  const data =
    clone(
      userData
    );



  data.updatedAt =
    new Date()
      .toISOString();



  await setDoc(

    doc(

      database,

      COLLECTIONS.conversate,

      data.user_idx

    ),

    data

  );



  /*
  Refresh local cache too.
  */

  saveLocalConversateData(
    data
  );


  return data;

}



/*
==================================================
GET CURRENT USER
==================================================
*/

async function getCurrentUser() {

  const userIdx =
    getSessionUserIdx();



  if (
    !userIdx
  ) {

    return null;

  }



  const account =
    await findAccountByUserIdx(
      userIdx
    );



  if (
    !account
  ) {

    clearSession();

    return null;

  }



  account.user_idx =

    account.user_idx ||

    account.documentId;



  saveLocalAccount(
    account
  );


  return account;

}



/*
==================================================
GET CURRENT USER CONVERSATE DATA
==================================================
*/

async function getCurrentUserData() {

  const userIdx =
    getSessionUserIdx();



  if (
    !userIdx
  ) {

    return null;

  }



  return await loadUserData(
    userIdx
  );

}



/*
==================================================
GET ROOMS
==================================================
*/

async function getRooms() {

  const userData =
    await getCurrentUserData();



  if (
    !userData
  ) {

    return [];

  }



  return Array.isArray(
    userData.rooms
  )
    ? userData.rooms
    : [];

}



/*
==================================================
GET CURRENT ROOM
==================================================
*/

async function getCurrentRoom() {

  const roomIdx =
    getCurrentRoomIdx();



  if (
    !roomIdx
  ) {

    return null;

  }



  const rooms =
    await getRooms();



  return (

    rooms.find(
      function(room) {

        return (
          room.room_idx ===
          roomIdx
        );

      }
    ) ||

    null

  );

}



/*
==================================================
CREATE ROOM
==================================================

Initial room structure stays almost exactly
the same as LingoGPT.

Later we can safely add:

level
domain
scenario
conversation_mode
etc.
==================================================
*/

async function createRoom(
  roomName,
  sourceLanguage,
  targetLanguage
) {

  roomName =
    String(
      roomName || ""
    ).trim();


  sourceLanguage =
    String(
      sourceLanguage || ""
    ).trim();


  targetLanguage =
    String(
      targetLanguage || ""
    ).trim();



  if (
    !roomName
  ) {

    throw new Error(
      "Enter a room name."
    );

  }



  if (
    !sourceLanguage ||
    !targetLanguage
  ) {

    throw new Error(
      "Choose both languages."
    );

  }



  if (
    sourceLanguage ===
    targetLanguage
  ) {

    throw new Error(
      "Choose different source and target languages."
    );

  }



  const userData =
    await getCurrentUserData();



  if (
    !userData
  ) {

    throw new Error(
      "No logged-in user."
    );

  }



  if (
    !Array.isArray(
      userData.rooms
    )
  ) {

    userData.rooms =
      [];

  }



  const room = {

    room_idx:
      createId(
        "room"
      ),

    room_name:
      roomName,

    source_language:
      sourceLanguage,

    target_language:
      targetLanguage,

    room_data:
      [],

    createdAt:
      new Date()
        .toISOString()

  };



  userData.rooms.push(
    room
  );



  await saveUserData(
    userData
  );


  return room;

}



/*
==================================================
DELETE ROOM
==================================================
*/

async function deleteRoom(
  roomIdx
) {

  const userData =
    await getCurrentUserData();



  if (
    !userData
  ) {

    return false;

  }



  userData.rooms =
    Array.isArray(
      userData.rooms
    )

      ? userData.rooms.filter(
          function(room) {

            return (
              room.room_idx !==
              roomIdx
            );

          }
        )

      : [];



  await saveUserData(
    userData
  );



  /*
  Clear selected room if this
  room was currently open.
  */

  if (
    getCurrentRoomIdx() ===
    roomIdx
  ) {

    localStorage.removeItem(
      STORAGE_KEYS.currentRoom
    );

  }



  /*
  Remove Options and Teach temporary
  information belonging to this room.
  */

  clearTemporaryRoomData(
    roomIdx
  );


  return true;

}



/*
==================================================
SELECT ROOM
==================================================
*/

function selectRoom(
  roomIdx
) {

  localStorage.setItem(

    STORAGE_KEYS.currentRoom,

    roomIdx

  );

}



/*
==================================================
SAVE CHAT
==================================================

IMPORTANT:

This saves ONLY real conversation turns.

Examples:

USER
AI
USER
AI

options.js and teach.js must NOT use saveChat().

Their information stays in localStorage.
==================================================
*/

async function saveChat(
  roomIdx,
  chatData
) {

  const userData =
    await getCurrentUserData();



  if (
    !userData
  ) {

    throw new Error(
      "No logged-in user."
    );

  }



  const room =
    userData.rooms.find(
      function(item) {

        return (
          item.room_idx ===
          roomIdx
        );

      }
    );



  if (
    !room
  ) {

    throw new Error(
      "Room was not found."
    );

  }



  if (
    !Array.isArray(
      room.room_data
    )
  ) {

    room.room_data =
      [];

  }



  const chat = {

    ...clone(
      chatData
    )

  };



  if (
    !chat.chat_idx
  ) {

    chat.chat_idx =
      createId(
        "chat"
      );

  }



  const existingIndex =
    room.room_data.findIndex(
      function(item) {

        return (
          item.chat_idx ===
          chat.chat_idx
        );

      }
    );



  /*
  New message.
  */

  if (
    existingIndex === -1
  ) {

    room.room_data.push(
      chat
    );

  }


  /*
  Existing message being updated.
  */

  else {

    room.room_data[
      existingIndex
    ] = chat;

  }



  await saveUserData(
    userData
  );


  return chat;

}



/*
==================================================
DELETE CHAT
==================================================
*/

async function deleteChat(
  roomIdx,
  chatIdx
) {

  const userData =
    await getCurrentUserData();



  if (
    !userData
  ) {

    return false;

  }



  const room =
    userData.rooms.find(
      function(item) {

        return (
          item.room_idx ===
          roomIdx
        );

      }
    );



  if (
    !room
  ) {

    return false;

  }



  room.room_data =
    Array.isArray(
      room.room_data
    )

      ? room.room_data.filter(
          function(chat) {

            return (
              chat.chat_idx !==
              chatIdx
            );

          }
        )

      : [];



  await saveUserData(
    userData
  );


  return true;

}



/*
==================================================
LOCAL OPTIONS STORAGE
==================================================

These functions are available now for the
future options.js.

Nothing here is saved to Firebase.
==================================================
*/

function getOptionsData() {

  return readObject(
    STORAGE_KEYS.options
  );

}



function saveOptionsData(
  data
) {

  localStorage.setItem(

    STORAGE_KEYS.options,

    JSON.stringify(
      data || {}
    )

  );


  return data;

}



/*
==================================================
LOCAL TEACH STORAGE
==================================================

These functions are available now for
future teach.js.

Nothing here is saved to Firebase.
==================================================
*/

function getTeachData() {

  return readObject(
    STORAGE_KEYS.teach
  );

}



function saveTeachData(
  data
) {

  localStorage.setItem(

    STORAGE_KEYS.teach,

    JSON.stringify(
      data || {}
    )

  );


  return data;

}



/*
==================================================
LOGOUT
==================================================
*/

function logout() {

  clearSession();


  window.location.href =
    "loginregister.html";

}



/*
==================================================
LOGIN / REGISTER PAGE SETUP
==================================================

firebase.js is loaded on multiple pages.

This function only activates when:

#loginForm

or

#registerForm

exists.
==================================================
*/

function setupLoginPage() {

  const loginForm =
    document.getElementById(
      "loginForm"
    );


  const registerForm =
    document.getElementById(
      "registerForm"
    );



  /*
  This is not loginregister.html.
  */

  if (
    !loginForm &&
    !registerForm
  ) {

    return;

  }



  /*
  ==================================================
  LOGIN
  ==================================================
  */

  if (
    loginForm
  ) {

    loginForm.addEventListener(

      "submit",

      async function(event) {

        event.preventDefault();



        const username =
          document
            .getElementById(
              "loginUsername"
            )
            .value
            .trim();



        const password =
          document
            .getElementById(
              "loginPassword"
            )
            .value;



        const button =
          document.getElementById(
            "loginButton"
          );



        button.disabled =
          true;


        button.textContent =
          "Logging in...";



        showMessage(
          "Checking shared account..."
        );



        try {

          await loginUser(
            username,
            password
          );



          showMessage(
            "Login successful.",
            "success"
          );



          window.location.href =
            "welcome.html";


        } catch (error) {

          console.error(
            error
          );


          showMessage(

            error.message ||
            "Login failed.",

            "error"

          );


        } finally {

          button.disabled =
            false;


          button.textContent =
            "Login";

        }

      }

    );

  }



  /*
  ==================================================
  REGISTER
  ==================================================
  */

  if (
    registerForm
  ) {

    registerForm.addEventListener(

      "submit",

      async function(event) {

        event.preventDefault();



        const name =
          document
            .getElementById(
              "registerName"
            )
            .value
            .trim();



        const username =
          document
            .getElementById(
              "registerUsername"
            )
            .value
            .trim();



        const email =
          document
            .getElementById(
              "registerEmail"
            )
            .value
            .trim();



        const password =
          document
            .getElementById(
              "registerPassword"
            )
            .value;



        const confirmPassword =
          document
            .getElementById(
              "confirmPassword"
            )
            .value;



        if (
          password !==
          confirmPassword
        ) {

          showMessage(
            "The passwords do not match.",
            "error"
          );


          return;

        }



        const button =
          document.getElementById(
            "registerButton"
          );



        button.disabled =
          true;


        button.textContent =
          "Creating account...";



        showMessage(
          "Creating shared account..."
        );



        try {

          await registerUser({

            name:
              name,

            username:
              username,

            email:
              email,

            password:
              password

          });



          showMessage(
            "Account created successfully.",
            "success"
          );



          window.location.href =
            "welcome.html";


        } catch (error) {

          console.error(
            error
          );


          showMessage(

            error.message ||
            "Registration failed.",

            "error"

          );


        } finally {

          button.disabled =
            false;


          button.textContent =
            "Create Account";

        }

      }

    );

  }



  /*
  ==================================================
  RESTORE LAST USERNAME
  ==================================================
  */

  try {

    const saved =
      JSON.parse(

        localStorage.getItem(
          STORAGE_KEYS.savedLogin
        ) || "null"

      );



    if (
      saved &&
      saved.username &&
      document.getElementById(
        "loginUsername"
      )
    ) {

      document.getElementById(
        "loginUsername"
      ).value =
        saved.username;

    }


  } catch (error) {

    console.warn(
      error
    );

  }

}



/*
==================================================
SYNC
==================================================

welcome.html and index.html will call:

await ConversateFirebase.sync();

This does:

shared account
      +
Conversate Pro data
      ↓
browser cache
==================================================
*/

async function sync() {

  const user =
    await getCurrentUser();



  if (
    !user
  ) {

    return null;

  }



  const userData =
    await getCurrentUserData();



  return {

    user:
      user,

    data:
      userData

  };

}



/*
==================================================
GLOBAL API
==================================================

Pages can now use:

ConversateFirebase.sync()

ConversateFirebase.getRooms()

ConversateFirebase.createRoom(...)

ConversateFirebase.selectRoom(...)

ConversateFirebase.getCurrentRoom()

ConversateFirebase.saveChat(...)

ConversateFirebase.deleteChat(...)

etc.
==================================================
*/

window.ConversateFirebase =
  Object.freeze({

    /*
    Firebase database object
    */

    database:
      database,


    /*
    ==================================================
    ACCOUNT
    ==================================================
    */

    registerUser:
      registerUser,

    loginUser:
      loginUser,

    logout:
      logout,

    getCurrentUser:
      getCurrentUser,

    getSessionUserIdx:
      getSessionUserIdx,


    /*
    ==================================================
    USER DATA
    ==================================================
    */

    sync:
      sync,

    loadUserData:
      loadUserData,

    getCurrentUserData:
      getCurrentUserData,

    saveUserData:
      saveUserData,


    /*
    ==================================================
    ROOMS
    ==================================================
    */

    getRooms:
      getRooms,

    getCurrentRoom:
      getCurrentRoom,

    getCurrentRoomIdx:
      getCurrentRoomIdx,

    createRoom:
      createRoom,

    deleteRoom:
      deleteRoom,

    selectRoom:
      selectRoom,


    /*
    ==================================================
    REAL CONVERSATION CHATS
    ==================================================
    */

    saveChat:
      saveChat,

    deleteChat:
      deleteChat,


    /*
    ==================================================
    LOCAL OPTIONS DATA
    ==================================================
    */

    getOptionsData:
      getOptionsData,

    saveOptionsData:
      saveOptionsData,


    /*
    ==================================================
    LOCAL TEACH DATA
    ==================================================
    */

    getTeachData:
      getTeachData,

    saveTeachData:
      saveTeachData,


    /*
    ==================================================
    TEMPORARY DATA
    ==================================================
    */

    clearTemporaryRoomData:
      clearTemporaryRoomData,

    clearTemporaryData:
      clearTemporaryData,


    /*
    ==================================================
    STORAGE KEY NAMES

    options.js and teach.js can use these later.
    ==================================================
    */

    storageKeys:
      Object.freeze({

        data:
          STORAGE_KEYS.data,

        currentRoom:
          STORAGE_KEYS.currentRoom,

        options:
          STORAGE_KEYS.options,

        teach:
          STORAGE_KEYS.teach

      })

  });



/*
==================================================
START LOGIN PAGE
==================================================

When firebase.js is imported by loginregister.html,
the forms are connected automatically.

When imported by welcome.html/index.html,
nothing happens because those forms do not exist.
==================================================
*/

setupLoginPage();