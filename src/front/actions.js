class Actions {
  constructor(store, dispatch) {
    // mantenemos una referencia al store y al dispatch para poder actualizar el estado global desde las acciones
    this.store = store;
    this.dispatch = dispatch;
  }

  apiFetch = async (
    endpoint,
    method = "GET",
    body = null,
    isPrivate = true,
  ) => {
    // construimos la URL base a partir de la variable de entorno VITE_BACKEND_URL
    let backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    backendUrl = backendUrl.replace(/\/+$/, "");

    // aseguramos que la URL termine en /api
    if (!backendUrl.endsWith("/api")) {
      backendUrl += "/api";
    }

    const token = this.store.jwt;

    if (!token && isPrivate) {
      console.error("No token");
      return { code: 401, ok: false, error: "No token", data: null };
    }

    const fetchParams = { method, headers: {} };

    // configuramos el body si existe
    if (body) {
      fetchParams.body = JSON.stringify(body);
      fetchParams.headers["Content-Type"] = "application/json";
    }

    // añadimos el token de autorización si es una ruta privada
    if (isPrivate) {
      fetchParams.headers["Authorization"] = "Bearer " + token;
    }

    try {
      const resp = await fetch(backendUrl + endpoint, fetchParams);

      // Si el token expiró o es inválido, limpiamos y redirigimos
      if (resp.status === 401 || resp.status === 422) {
        console.error("Token expirado o inválido. Limpiando sesión...");

        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_username");
        localStorage.removeItem("token_timestamp");
        localStorage.removeItem("groups");

        this.dispatch({ type: "UNSET_USER" });
        window.location.href = "/login";

        return {
          code: resp.status,
          ok: false,
          error: "Sesión expirada",
          data: null,
        };
      }

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

    if (!resp.ok) return false;

    const data = resp.data;
    const now = Date.now();

    // 1. Guardar en Storage
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("user_username", data.username || "");
    localStorage.setItem("token_timestamp", now.toString());

    // 2. ACTUALIZACIÓN CRÍTICA: Actualizamos la referencia local del store
    // para que loadUserGroups lo vea de inmediato
    this.store.jwt = data.access_token;

    // 3. Dispatch para React
    this.dispatch({ type: "SET_JWT", payload: data.access_token });
    this.dispatch({
      type: "SET_USER",
      payload: {
        email: email,
        username: data.username,
      },
    });

    // 4. Ahora loadUserGroups sí encontrará el token en this.store.jwt
    await this.loadUserGroups();

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
    // Limpiamos todo el rastro local
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_username");
    localStorage.removeItem("token_timestamp");
    localStorage.removeItem("groups");

    this.dispatch({ type: "UNSET_USER" });

    // Avisamos al backend (opcional)
    await this.apiFetch("/logout", "POST", null, true);

    window.location.href = "/login";
    return true;
  };

  loadUserGroups = async (tokenOverride = null) => {
    // Si pasamos un token manual, lo usamos. Si no, usamos el del store.
    const token = tokenOverride || this.store.jwt;

    const resp = await this.apiFetch("/groups", "GET", null, true);

    if (!resp.ok) {
      console.error("Error al cargar grupos:", resp.error || resp.data?.error);
      return false;
    }

    const groups = resp.data.groups || [];
    this.dispatch({ type: "SET_GROUPS", payload: groups });
    localStorage.setItem("groups", JSON.stringify(groups));
    return true;
  };

  createGroup = async (formData) => {
    const resp = await this.apiFetch("/groups", "POST", formData, true);

    if (!resp.ok) {
      console.error("Error al crear grupo:", resp.error || resp.data?.error);
      return {
        success: false,
        error: resp.error || resp.data?.error || "Error al crear el grupo",
      };
    }

    await this.loadUserGroups();
    this.dispatch({ type: "SET_GROUPS", payload: this.store.groups });

    return { success: true, data: resp.data };
  };
}

export default Actions;
