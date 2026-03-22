class Actions {
  constructor(store, dispatch) {
    this.store = store;
    this.dispatch = dispatch;
  }

  apiFetch = async (
    endpoint,
    method = "GET",
    body = null,
    isPrivate = true,
  ) => {
    let backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    backendUrl = backendUrl.replace(/\/+$/, "");

    if (!backendUrl.endsWith("/api")) {
      backendUrl += "/api";
    }

    const token = this.store.jwt;

    if (!token && isPrivate) {
      console.error("No token");
      return { code: 401, ok: false, error: "No token", data: null };
    }

    const fetchParams = { method, headers: {} };

    if (body) {
      fetchParams.body = JSON.stringify(body);
      fetchParams.headers["Content-Type"] = "application/json";
    }

    if (isPrivate) {
      fetchParams.headers["Authorization"] = "Bearer " + token;
    }

    try {
      const resp = await fetch(backendUrl + endpoint, fetchParams);

      if (resp.status === 401 || resp.status === 422) {
        console.error("Token expired or invalid. Clearing session...");

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
          error: "Session expired",
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

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("user_username", data.username || "");
    localStorage.setItem("token_timestamp", now.toString());

    this.store.jwt = data.access_token;

    this.dispatch({ type: "SET_JWT", payload: data.access_token });
    this.dispatch({
      type: "SET_USER",
      payload: {
        email: email,
        username: data.username,
      },
    });

    await this.loadUserGroups();

    // --- MODIFICACIÓN PARA INVITACIONES ---
    const pendingToken = localStorage.getItem("pending_invite_token");
    if (pendingToken) {
      // Si hay una invitación pendiente, redirigimos a la vista de aceptar
      window.location.href = `/accept-invite?token=${pendingToken}`;
      return true; 
    }
    // ---------------------------------------

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
      console.error("Registration failed:", resp.error || resp.data.error);
      return false;
    }

    return true;
  };

  logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_username");
    localStorage.removeItem("token_timestamp");
    localStorage.removeItem("groups");
    localStorage.removeItem("pending_invite_token"); // Limpiamos también esto al salir

    this.dispatch({ type: "UNSET_USER" });

    await this.apiFetch("/logout", "POST", null, true);

    return true;
  };

  createGroup = async (formData) => {
    const resp = await this.apiFetch("/groups", "POST", formData, true);

    if (!resp.ok) {
      console.error("Error creating group:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error || "Error creating group" };
    }
    
    await this.loadUserGroups();
    
    return { success: true, data: resp.data };
  };

  addExpense = async (groupId, expenseData) => {
    const resp = await this.apiFetch(`/groups/${groupId}/expenses`, "POST", expenseData, true);

    if (!resp.ok) {
      console.error("Error adding expense:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error || "Error adding expense" };
    }
    
    await this.loadUserGroups();
    
    return { success: true, data: resp.data };
  };

  fetchGroupBalances = async (groupId) => {
    const groupResp = await this.apiFetch(`/groups/${groupId}`, "GET", null, true);
    if (!groupResp.ok) {
        return { success: false, error: "Could not load group." };
    }

    const storeUser = this.store.user;
    
    const usersMap = {
        [1]: { id: 1, username: storeUser?.username || "Admin" },
        [2]: { id: 2, username: "Juan Pérez" },
        [3]: { id: 3, username: "María López" }
    };

    return {
        success: true,
        data: {
            personal_balances: { 1: 0, 2: 0, 3: 0 },
            settlements: [],
            users: usersMap
        }
    };
  };

  loadUserGroups = async () => {
    const resp = await this.apiFetch("/groups", "GET", null, true);

    if (!resp.ok) {
      console.error("Error loading groups:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error };
    }

    const groups = resp.data?.groups || [];

    localStorage.setItem("groups", JSON.stringify(groups));
    this.dispatch({ type: "SET_GROUPS", payload: groups });
    return { success: true, data: groups };
  };

  generateInviteLink = async (groupId, email = null) => {
    const body = email ? { email: email } : {};
    // Corregido: Enviamos el body si existe
    const resp = await this.apiFetch(`/groups/${groupId}/invite-link`, "POST", body, true);
    
    if (resp.ok) {
      return { 
        success: true, 
        link: resp.data.link,
        token: resp.data.token
      };
    }

    return { success: false, error: "No se pudo generar el link" };
  };
}

export default Actions;