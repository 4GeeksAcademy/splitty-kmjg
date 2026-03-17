
// Import necessary hooks and functions from React.
import { useContext, useReducer, createContext, useEffect } from "react";
import storeReducer, { initialStore } from "../store"  // Import the reducer and the initial state.

// Create a context to hold the global state of the application
// We will call this global state the "store" to avoid confusion while using local states
const StoreContext = createContext()
import Actions from "../actions"

// Define a provider component that encapsulates the store and warps it in a context provider to 
// broadcast the information throught all the app pages and components.
export function StoreProvider({ children }) {
    // Initialize reducer with the initial state.
    const [store, dispatch] = useReducer(storeReducer, initialStore());

    // define helper actions that encapsulate common async flows
    const actions = new Actions(store, dispatch);

    // if the token exists we schedule an automatic logout when it expires
    // also run immediately if the timestamp already passed (e.g. the user leaves the page open overnight)
    useEffect(() => {
        if (!store.jwt) return;
        const ts = parseInt(localStorage.getItem("token_timestamp") || "0", 10);
        const fourDays = 4 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const expiresAt = ts + fourDays;

        if (now >= expiresAt) {
            // already expired
            actions.logout();
            return;
        }
        const delay = expiresAt - now;
        const timer = setTimeout(() => {
            actions.logout();
        }, delay);
        return () => clearTimeout(timer);
    }, [store.jwt]);

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