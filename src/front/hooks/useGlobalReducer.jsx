// Import necessary hooks and functions from React.
import { useContext, useReducer, createContext } from "react";
import storeReducer, { initialStore } from "../store"  // Import the reducer and the initial state.

// Create a context to hold the global state of the application
// We will call this global state the "store" to avoid confusion while using local states
const StoreContext = createContext()

// Define a provider component that encapsulates the store and warps it in a context provider to 
// broadcast the information throught all the app pages and components.
export function StoreProvider({ children }) {
    // Initialize reducer with the initial state.
    const [store, dispatch] = useReducer(storeReducer, initialStore());

    // define helper actions that encapsulate common async flows
    const actions = {
        login: async (email, password) => {
            try {
                // ensure there isn't a trailing slash to avoid doubled segments
                let backendUrl = import.meta.env.VITE_BACKEND_URL || "";
                backendUrl = backendUrl.replace(/\/+$/, "");
                // ensure final URL ends with /api (not /api/api)
                if (!backendUrl.endsWith("/api")) {
                    backendUrl += "/api";
                }
                const res = await fetch(`${backendUrl}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok && data.access_token) {
                    localStorage.setItem("token", data.access_token);
                    localStorage.setItem("user_email", email);
                    dispatch({ type: "SET_JWT", payload: data.access_token });
                    dispatch({ type: "SET_USER", payload: { email } });
                    return true;
                }
                console.error("Login failed:", data);
                return false;
            } catch (err) {
                console.error("Login error", err);
                return false;
            }
        },
        register: async (email, password, username, ci) => {
            try {
                let backendUrl = import.meta.env.VITE_BACKEND_URL || "";
                backendUrl = backendUrl.replace(/\/+$/, "");
                if (!backendUrl.endsWith("/api")) {
                    backendUrl += "/api";
                }
                const res = await fetch(`${backendUrl}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, username, ci })
                });
                if (res.ok) {
                    return true;
                }
                const data = await res.json();
                console.error("Register failed:", data);
                return false;
            } catch (err) {
                console.error("Register error", err);
                return false;
            }
        }
        // other actions can go here
    };

    // Provide the store, dispatch method and actions to all child components.
    return (
        <StoreContext.Provider value={{ store, dispatch, actions }}>
            {children}
        </StoreContext.Provider>
    );
}

// Custom hook to access the global state, dispatch function and helper actions.
export default function useGlobalReducer() {
    const { dispatch, store, actions } = useContext(StoreContext);
    return { dispatch, store, actions };
}