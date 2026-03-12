class Actions {
  constructor(store, dispatch) {
    // mantienemos una referencia al store y al dispatch para poder actualizar el estado global desde las acciones
    this.store = store;
    this.dispatch = dispatch;
  }

  apiFetch = async (
    endpoint,
    method = "GET",
    body = null,
    isPrivate = true,
  ) => {
    // construimos la URL base a partir de la variable de entorno VITE_BACKEND_URL, asegurándonos de eliminar cualquier barra al final y añadir "/api" si no está presente
    let backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    backendUrl = backendUrl.replace(/\/+$/, "");
    // ensure final URL ends with /api (not /api/api)
    if (!backendUrl.endsWith("/api")) {
      backendUrl += "/api";
    }

    const token = this.store.jwt;

    if (!token && isPrivate) {
      console.error("No token");
      return { code: 401, ok: false, error: "No token", data: null };
    }

    const fetchParams = { method, headers: {} };

    // comprobamos si hay un body y lo añadimos a los parámetros de la petición, asegurándonos de establecer el header Content-Type
    if (body) {
      fetchParams.body = JSON.stringify(body);
      fetchParams.headers["Content-Type"] = "application/json";
    }
    //  si la petición es privada, añadimos el token al header Authorization
    if (isPrivate) {
      fetchParams.headers["Authorization"] = "Bearer " + token;
    }

    try {
      const resp = await fetch(backendUrl + endpoint, fetchParams);
      
      // 👇 LO NUEVO: Si el backend nos rechaza por token expirado (401 o 422)
      if (resp.status === 401 || resp.status === 422) {
        console.error("Token expirado o inválido. Limpiando sesión...");
        
        // Destruimos la sesión local
        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        localStorage.removeItem("token_timestamp");
        this.dispatch({ type: "UNSET_USER" });
        
        // Lo mandamos al login para que no se quede atrapado
        window.location.href = "/login";
        
        return { code: resp.status, ok: false, error: "Sesión expirada", data: null };
      }
      // 👆 FIN DE LO NUEVO

      let data = await resp.json();
      return { code: resp.status, ok: resp.ok, data };
    } catch (error) {
      return { code: 0, ok: false, error: error.message, data: null };
    }
  };

  login = async (email, password) => {
    const resp = await this.apiFetch(
      "/login",
      "POST",
      { email, password },
      false,
    );

    if (!resp.ok) {
      console.error("Login failed:", resp.error || resp.data.error);
      return false;
    }

    const data = resp.data;

    const now = Date.now();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("token_timestamp", now.toString());

    this.dispatch({ type: "SET_JWT", payload: data.access_token });
    this.dispatch({ type: "SET_USER", payload: { email: email } });

    return true;
  };

  register = async (email, password, username) => {
    const resp = await this.apiFetch(
      "/register",
      "POST",
      { email, password, username },
      false,
    );

    if (!resp.ok) {
      console.error("Registro fallido:", resp.error || resp.data.error);
      return false;
    }

    return true;
  };

 logout = async () => {
    // 1. PRIMERO limpiamos el navegador y el estado de React
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("token_timestamp");
    this.dispatch({ type: "UNSET_USER" });

    // 2. LUEGO le avisamos al backend (si da error, no nos importa porque ya limpiamos el front)
    await this.apiFetch("/logout", "POST", null, true);

    // 3. Redirigimos al inicio o login
    window.location.href = "/login";
    
    return true;
  };
}

export default Actions;
