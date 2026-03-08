export const initialStore = () => {
  return {
    jwt: localStorage.getItem("token") || null,
    user: {
      email: localStorage.getItem("user_email") || null,
    },
    message: null
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "SET_JWT":
      return {
        ...store,
        jwt: action.payload
      };

    case "SET_USER":
      return {
        ...store,
        user: action.payload
      };

    case "UNSET_USER":
      return {
        ...store,
        user: {
          email: null
        },
        jwt: null
      };

    case "set_hello":
      return {
        ...store,
        message: action.payload
      };

    default:
      throw Error("Unknown action: " + action.type);
  }
}