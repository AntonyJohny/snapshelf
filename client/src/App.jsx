// import { useCallback, useEffect, useState } from "react";
// import UploadForm from "./components/UploadForm";
// import ImageGrid from "./components/ImageGrid";
// import SearchBar from "./components/SearchBar";
// import AuthScreen from "./components/AuthScreen";
// import { clearAuthToken, fetchImages, getAuthToken, saveAuthToken, verifySession } from "./api";

// export default function App() {
//   const [images, setImages] = useState([]);
//   const [query, setQuery] = useState("");
//   const [error, setError] = useState("");
//   const [authenticated, setAuthenticated] = useState(false);
//   const [authLoading, setAuthLoading] = useState(() => Boolean(getAuthToken()));
//   const [authError, setAuthError] = useState("");
//   const [email, setEmail] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   useEffect(() => {
//     if (!getAuthToken()) return;

//     verifySession()
//       .then(({ user }) => {
//         setEmail(user.email);
//         setAuthenticated(true);
//       })
//       .catch((authRequestError) => {
//         clearAuthToken();
//         setAuthError(authRequestError.message);
//       })
//       .finally(() => setAuthLoading(false));
//   }, []);

//   const load = useCallback(() => setRefreshKey((key) => key + 1), []);

//   useEffect(() => {
//     if (!authenticated) return;
//     let active = true;

//     fetchImages(query)
//       .then((result) => {
//         if (active) {
//           setImages(result);
//           setError("");
//         }
//       })
//       .catch((requestError) => {
//         if (active) setError(requestError.message);
//       });

//     return () => { active = false; };
//   }, [authenticated, query, refreshKey]);

//   // while any image is still processing, check again every 3 seconds
//   useEffect(() => {
//     if (!authenticated || !images.some((i) => i.status === "PROCESSING")) return;
//     const timer = setInterval(load, 3000);
//     return () => clearInterval(timer);
//   }, [authenticated, images, load]);

//   function handleAuthenticated(result) {
//     saveAuthToken(result.token);
//     setEmail(result.user.email);
//     setAuthError("");
//     setAuthenticated(true);
//   }

//   function handleSignOut() {
//     clearAuthToken();
//     setAuthenticated(false);
//     setImages([]);
//     setQuery("");
//     setError("");
//     setEmail("");
//   }

//   if (authLoading) {
//     return <main className="auth-page" aria-label="Checking your session">Loading...</main>;
//   }

//   if (!authenticated) {
//     return (
//       <main className="auth-page">
//         <AuthScreen onAuthenticated={handleAuthenticated} initialError={authError} />
//       </main>
//     );
//   }

//   return (
//     <main className="app-shell">
//       <header className="app-header">
//         <h1>Snapshelf</h1>
//         <div className="account-actions">
//           <span className="account-email">{email}</span>
//           <button className="sign-out-button" type="button" onClick={handleSignOut}>
//             Sign out
//           </button>
//         </div>
//       </header>
//       <UploadForm onDone={load} />
//       <SearchBar value={query} onChange={setQuery} />
//       {error && <p className="gallery-error" role="alert">{error}</p>}
//       <ImageGrid images={images} onDone={load} />
//     </main>
//   );
// }


import { useCallback, useEffect, useState } from "react";
import UploadForm from "./components/UploadForm";
import ImageGrid from "./components/ImageGrid";
import SearchBar from "./components/SearchBar";
import AuthScreen from "./components/AuthScreen";
import {
  clearAuthToken,
  fetchImages,
  getAuthToken,
  saveAuthToken,
  verifySession,
} from "./api";

export default function App() {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(
    () => Boolean(getAuthToken())
  );
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!getAuthToken()) return;

    verifySession()
      .then(({ user }) => {
        setEmail(user.email);
        setAuthenticated(true);
      })
      .catch((authRequestError) => {
        clearAuthToken();
        setAuthError(authRequestError.message);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const load = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    let active = true;

    fetchImages(query)
      .then((result) => {
        if (active) {
          setImages(result);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [authenticated, query, refreshKey]);

  useEffect(() => {
    if (
      !authenticated ||
      !images.some((image) => image.status === "PROCESSING")
    ) return;

    const timer = setInterval(load, 3000);

    return () => clearInterval(timer);
  }, [authenticated, images, load]);

  function handleAuthenticated(result) {
    saveAuthToken(result.token);
    setEmail(result.user.email);
    setAuthError("");
    setAuthenticated(true);
  }

  function handleSignOut() {
    clearAuthToken();
    setAuthenticated(false);
    setImages([]);
    setQuery("");
    setError("");
    setEmail("");
  }

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="session-loader">
          <span className="brand-mark">S</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-layout">
          <div className="auth-intro">
            <span className="brand-lockup">
              <span className="brand-mark">S</span>
              snapshelf
            </span>
          </div>

          <AuthScreen
            onAuthenticated={handleAuthenticated}
            initialError={authError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">

      <header className="app-header">
        <a className="brand-lockup" href="/" aria-label="SnapShelf home">
          <span className="brand-mark">S</span>
          <span>snapshelf</span>
        </a>

        <div className="header-right">
          <span className="account-email" title={email}>
            {email}
          </span>

          <span className="avatar" aria-hidden="true">
            {email.charAt(0).toUpperCase()}
          </span>

          <button
            className="sign-out-button"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="upload-section">
        <UploadForm onDone={load} />
      </section>

      <section className="library-section">
        <div className="library-heading">
          <div className="library-search">
            <SearchBar
              value={query}
              onChange={setQuery}
            />
          </div>
        </div>

        {error && (
          <p className="gallery-error" role="alert">
            {error}
          </p>
        )}

        <ImageGrid
          images={images}
          onDone={load}
        />
      </section>

    </main>
  );
}
