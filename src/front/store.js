export const initialStore = () => {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("user_email");
  const username = localStorage.getItem("user_username");
  const ts = parseInt(localStorage.getItem("token_timestamp") || "0", 10);
  const now = Date.now();

  // Intentamos leer los grupos del localStorage, si falla por algún motivo, usamos []
  let groups = [];
  try {
    groups = JSON.parse(localStorage.getItem("groups") || "[]");
  } catch (e) {
    groups = [];
  }

  // Si un token existe pero ha expirado (4 días), limpiamos todo
  if (token && ts && now - ts > 4 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_username");
    localStorage.removeItem("token_timestamp");
    localStorage.removeItem("groups");

    return {
      jwt: null,
      user: { email: null, username: null },
      groups: [],
    };
  }

  return {
    jwt: token || null,
    user: {
      email: email || null,
      username: username || null,
    },
    groups: groups,
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
          ...store.user, // Mantenemos lo que ya había (como el email)
          ...action.payload, // Sobrescribimos con lo nuevo (como el username)
        },
      };

    case "UNSET_USER":
      return {
        ...store,
        user: {
          email: null,
          username: null,
        },
        jwt: null,
        groups: [], // Al cerrar sesión, también limpiamos los grupos del estado
      };

    case "SET_GROUPS":
      return {
        ...store,
        groups: action.payload,
      };

    default:
      throw Error("Unknown action: " + action.type);
  }
}
