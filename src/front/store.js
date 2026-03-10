export const initialStore = () => {
  // verificamos si el token existe y no ha expirado para inicializar el estado con el usuario logueado
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("user_email");
  const ts = parseInt(localStorage.getItem("token_timestamp") || "0", 10);
  const now = Date.now();

  // Si un token existe pero ha expirado, lo eliminamos y retornamos el estado inicial sin usuario ni token
  if (token && ts && now - ts > 4 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("token_timestamp");
    return {
      jwt: null,
      user: { email: null },
    };
  }

  return {
    jwt: token || null,
    user: { email: email || null },
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
        user: action.payload,
      };

    case "UNSET_USER":
      return {
        ...store,
        user: {
          email: null,
        },
        jwt: null,
      };

    default:
      throw Error("Unknown action: " + action.type);
  }
}
