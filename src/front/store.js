export const initialStore = () => {
  let token = localStorage.getItem("token");
  if (token === "undefined" || token === "null") token = null;
  
  let email = localStorage.getItem("user_email");
  if (email === "undefined" || email === "null") email = null;
  
  let username = localStorage.getItem("user_username");
  if (username === "undefined" || username === "null") username = null;
  
  let userId = localStorage.getItem("user_id");
  if (userId === "undefined" || userId === "null") userId = null;
  
  const ts = parseInt(localStorage.getItem("token_timestamp") || "0", 10);
  const now = Date.now();

 
  let groups = [];
  try {
    groups = JSON.parse(localStorage.getItem("groups") || "[]");
  } catch (e) {
    groups = [];
  }

  
  if (token && ts && now - ts > 4 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_username");
    localStorage.removeItem("user_id");
    localStorage.removeItem("token_timestamp");
    localStorage.removeItem("groups");

    return {
      jwt: null,
      user: { id: null, email: null, username: null },
      groups: [],
    };
  }

  return {
    jwt: token || null,
    user: {
      id: userId ? parseInt(userId, 10) : null,
      email: email || null,
      username: username || null,
    },
    groups: groups,
    friends: [],
    friendRequests: { received: [], sent: [] },
    friendDebts: null,
    friendsLoading: false,
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "SET_JWT":
      return {
        ...store,
        jwt: action.payload,
      };

    case "SET_USER":
      return {
        ...store,
        user: {
          ...store.user, // Keep what was already there (like the email)
          ...action.payload, // Overwrite with new data (like the username)
        },
      };

    case "UNSET_USER":
      return {
        ...store,
        user: {
          id: null,
          email: null,
          username: null,
        },
        jwt: null,
        groups: [],
        friends: [],
        friendRequests: { received: [], sent: [] },
        friendDebts: null,
      };

    case "SET_GROUPS":
      return {
        ...store,
        groups: action.payload,
      };

    case "SET_FRIENDS":
      return {
        ...store,
        friends: action.payload,
      };

    case "SET_FRIEND_REQUESTS":
      return {
        ...store,
        friendRequests: action.payload,
      };

    case "SET_FRIEND_DEBTS":
      return {
        ...store,
        friendDebts: action.payload,
      };

    case "SET_FRIENDS_LOADING":
      return {
        ...store,
        friendsLoading: action.payload,
      };

    default:
      throw Error("Unknown action: " + action.type);
  }
}
