// ============================================================
// Auth.js — Google Authentication manager
// Handles sign-in, sign-out, and user state
// ============================================================

class Auth {
  static user     = null;
  static _auth    = null;
  static _onReady = null;

  static init(firebaseApp) {
    const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = window.FirebaseAuthAPI;
    Auth._auth = getAuth(firebaseApp);

    return new Promise((resolve) => {
      onAuthStateChanged(Auth._auth, (user) => {
        Auth.user = user;
        resolve(user);
      });
    });
  }

  static async signIn() {
    const { GoogleAuthProvider, signInWithPopup } = window.FirebaseAuthAPI;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(Auth._auth, provider);
      Auth.user = result.user;
      return result.user;
    } catch (e) {
      console.error('Sign in failed:', e.message);
      throw e;
    }
  }

  static async signOut() {
    const { signOut } = window.FirebaseAuthAPI;
    await signOut(Auth._auth);
    Auth.user = null;
  }

  static get uid() {
    return Auth.user ? Auth.user.uid : null;
  }

  static get displayName() {
    return Auth.user ? Auth.user.displayName : null;
  }

  static get email() {
    return Auth.user ? Auth.user.email : null;
  }

  static get photoURL() {
    return Auth.user ? Auth.user.photoURL : null;
  }

  static get isLoggedIn() {
    return !!Auth.user;
  }
}
