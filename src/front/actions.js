class Actions {
  static useLocalFallback = false;

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
    const baseUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
    // Aseguramos que el path sea /api si no viene en la URL base
    const apiPath = baseUrl.includes("/api") ? "" : "/api";
    // Normalizamos el endpoint para que siempre empiece con /
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = `${baseUrl}${apiPath}${cleanEndpoint}`;

    const token = this.store.jwt;

    if (!token && isPrivate) {
      console.error("No token");
      return { code: 401, ok: false, error: "No token", data: null };
    }

    const fetchParams = { method, headers: {} };

    if (body) {
      if (body instanceof FormData) {
        fetchParams.body = body;
      } else {
        fetchParams.body = JSON.stringify(body);
        fetchParams.headers["Content-Type"] = "application/json";
      }
    }

    if (isPrivate) {
      fetchParams.headers["Authorization"] = "Bearer " + token;
    }

    try {
      const resp = await fetch(fullUrl, fetchParams);

      if (isPrivate && (resp.status === 401 || resp.status === 422)) {
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

      if (!resp.ok) {
        console.error(`Error de API [${resp.status}] en ${endpoint}:`, data);
      }

      return { code: resp.status, ok: resp.ok, data };
    } catch (error) {
      console.error(`Error de conexión (Fetch) en ${endpoint}:`, error);
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
      const msg =
        resp.data?.msg ||
        resp.data?.error ||
        resp.error ||
        "Invalid email or password.";
      return { ok: false, error: msg };
    }

    const data = resp.data;
    const now = Date.now();

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("user_username", data.username || "");
    if (data.id) localStorage.setItem("user_id", data.id.toString());
    localStorage.setItem("token_timestamp", now.toString());

    this.store.jwt = data.access_token;

    this.dispatch({ type: "SET_JWT", payload: data.access_token });
    this.dispatch({
      type: "SET_USER",
      payload: {
        id: data.id,
        email: email,
        username: data.username,
      },
    });

    await this.loadUserGroups();

    return { ok: true };
  };

  register = async (email, password, username) => {
    const resp = await this.apiFetch(
      "/register",
      "POST",
      { email, password, username },
      false,
    );

    if (!resp.ok) {
      const msg =
        resp.data?.msg ||
        resp.data?.error ||
        resp.error ||
        "Registration failed. Please try again.";
      console.error("Registration failed:", msg);
      return { ok: false, error: msg };
    }

    return { ok: true };
  };

  logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_username");
    localStorage.removeItem("user_id");
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

  deleteGroup = async (groupId) => {
    const resp = await this.apiFetch(`/groups/${groupId}`, "DELETE", null, true);

    if (!resp.ok) {
      console.error("Error deleting group:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error || "Error deleting group" };
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

  updateExpense = async (expenseId, expenseData) => {
    const resp = await this.apiFetch(`/expenses/${expenseId}`, "PUT", expenseData, true);

    if (!resp.ok) {
      console.error("Error updating expense:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error || "Error updating expense" };
    }
    
    await this.loadUserGroups();
    
    return { success: true, data: resp.data };
  };

  deleteExpense = async (expenseId) => {
    const resp = await this.apiFetch(`/expenses/${expenseId}`, "DELETE", null, true);

    if (!resp.ok) {
      console.error("Error deleting expense:", resp.error || resp.data?.error);
      return { success: false, error: resp.error || resp.data?.error || "Error deleting expense" };
    }
    
    await this.loadUserGroups();
    
    return { success: true, data: resp.data };
  };

  analyzeReceipt = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const resp = await this.apiFetch(`/receipt/analyze`, "POST", formData, true);
    
    if (!resp.ok) {
        console.error("Error analyzing receipt:", resp.error || resp.data?.error);
        return { success: false, error: resp.error || resp.data?.error || "Error analyzing receipt" };
    }
    
    return { success: true, data: resp.data.data };
  };

  uploadReceipt = async (expenseId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const resp = await this.apiFetch(`/expense/${expenseId}/receipt`, "POST", formData, true);

    
    if (!resp.ok) {
        console.error("Error uploading receipt:", resp.error || resp.data?.error);
        return { success: false, error: resp.error || resp.data?.error || "Error uploading receipt" };
    }
    
    await this.loadUserGroups();
    return { success: true, data: resp.data };
  };

  deleteReceipt = async (expenseId) => {
    const resp = await this.apiFetch(`/expense/${expenseId}/receipt`, "DELETE", null, true);
    
    if (!resp.ok) {
        console.error("Error deleting receipt:", resp.error || resp.data?.error);
        return { success: false, error: resp.error || resp.data?.error || "Error deleting receipt" };
    }
    
    await this.loadUserGroups();
    return { success: true, data: resp.data };
  };

  fetchGroupBalances = async (groupId) => {
    // 1. Fetch group details (members)
    const groupResp = await this.apiFetch(`/groups/${groupId}`, "GET", null, true);
    if (!groupResp.ok) {
        return { success: false, error: groupResp.data?.error || "Could not load group." };
    }

    // 2. Fetch expenses (to show in the list)
    const expensesResp = await this.apiFetch(`/groups/${groupId}/expenses`, "GET", null, true);
    
    // 3. Fetch balances & settlements from the backend (NEW: includes payments)
    const balancesResp = await this.apiFetch(`/groups/${groupId}/balances`, "GET", null, true);
    
    if (!balancesResp.ok) {
        return { success: false, error: balancesResp.data?.error || "Could not load balances." };
    }

    // Build users map from members
    const members = groupResp.data.members || [];
    const usersMap = {};
    members.forEach(m => {
        usersMap[m.id] = { id: m.id, username: m.username };
    });

    const rawExpenses = expensesResp.ok ? (expensesResp.data.expenses || []) : [];
    const balancesData = balancesResp.data;

    return {
        success: true,
        data: {
            personal_balances: balancesData.balances, // { "userId": amount }
            settlements: balancesData.transactions,   // [ { from, to, amount } ]
            users: usersMap,
            expenses: rawExpenses
        }
    };
  };

  settleExpense = async (expenseId) => {
    const resp = await this.apiFetch(`/expenses/${expenseId}/settle`, "POST", null, true);
    if (!resp.ok) {
        console.error("Error settling expense:", resp.error || resp.data?.error);
        return { success: false, error: resp.error || resp.data?.error || "Error settling expense" };
    }
    
    // Optional: reload groups or specific data if needed
    return { success: true, data: resp.data };
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

  
  // ===============================
  // FRIENDS SYSTEM
  // ===============================

  loadFriends = async () => {
    this.dispatch({ type: "SET_FRIENDS_LOADING", payload: true });
    const resp = await this.apiFetch("/friends");
    if (resp.ok) {
      this.dispatch({ type: "SET_FRIENDS", payload: resp.data.friends });
    }
    this.dispatch({ type: "SET_FRIENDS_LOADING", payload: false });
    return resp;
  };

  loadPendingRequests = async () => {
    const resp = await this.apiFetch("/friends/pending");
    if (resp.ok) {
      this.dispatch({ type: "SET_FRIEND_REQUESTS", payload: resp.data });
    }
    return resp;
  };

  sendFriendRequest = async (userIdOrEmail) => {
    const body = typeof userIdOrEmail === "number"
      ? { user_id: userIdOrEmail }
      : { email: userIdOrEmail };
    
    const resp = await this.apiFetch("/friends/request", "POST", body);
    if (resp.ok) {
      await this.loadPendingRequests();
    }
    return resp;
  };

  acceptFriendRequest = async (friendshipId) => {
    const resp = await this.apiFetch(`/friends/accept/${friendshipId}`, "POST");
    if (resp.ok) {
      await this.loadFriends();
      await this.loadPendingRequests();
    }
    return resp;
  };

  declineFriendRequest = async (friendshipId) => {
    const resp = await this.apiFetch(`/friends/decline/${friendshipId}`, "POST");
    if (resp.ok) {
      await this.loadPendingRequests();
    }
    return resp;
  };

  removeFriend = async (friendshipId) => {
    const resp = await this.apiFetch(`/friends/${friendshipId}`, "DELETE");
    if (resp.ok) {
      await this.loadFriends();
      await this.loadFriendDebts();
    }
    return resp;
  };

  loadFriendDebts = async () => {
    const resp = await this.apiFetch("/friends/debts");
    if (resp.ok) {
      this.dispatch({ type: "SET_FRIEND_DEBTS", payload: resp.data });
    }
    return resp;
  };

  generateFriendInviteLink = async (email = null) => {
    const body = email ? { email } : {};
    const resp = await this.apiFetch("/friends/invite-link", "POST", body);
    return resp;
  };

  acceptFriendInvite = async (token) => {
    const resp = await this.apiFetch("/friends/accept-invite", "POST", { token });
    if (resp.ok) {
      await this.loadFriends();
    }
    return resp;
  };

  searchUsers = async (query) => {
    if (!query || query.length < 1) return { ok: false, data: { users: [] } };
    const resp = await this.apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
    return resp;
  };

  // ===============================
  // PAYMENTS SYSTEM
  // ===============================

  fetchGroupPayments = async (groupId) => {
    const resp = await this.apiFetch(`/groups/${groupId}/payments`, "GET", null, true);
    if (resp.ok) {
      this.dispatch({
        type: "SET_GROUP_PAYMENTS",
        payload: { groupId, payments: resp.data.payments || [] }
      });
      return { success: true, data: resp.data.payments };
    }
    return { success: false, error: resp.data?.error || "Failed to fetch payments" };
  };

  createPayment = async (groupId, paymentData) => {
    const resp = await this.apiFetch(`/groups/${groupId}/payments`, "POST", paymentData, true);
    if (resp.ok) {
      this.dispatch({
        type: "ADD_PAYMENT",
        payload: { groupId, payment: resp.data.payment }
      });
      // Actualizar deudas y pendientes después de crear un pago
      await this.loadFriendDebts();
      await this.fetchPendingPayments();
      return { success: true, data: resp.data.payment };
    }
    return { success: false, error: resp.data?.error || "Failed to create payment" };
  };

  confirmPayment = async (paymentId) => {
    const resp = await this.apiFetch(`/payments/${paymentId}/confirm`, "PUT", null, true);
    if (resp.ok) {
      const payment = resp.data.payment;
      this.dispatch({
        type: "UPDATE_PAYMENT",
        payload: { groupId: payment.group_id, payment }
      });
      // Actualizar deudas y pendientes después de confirmar un pago
      await this.loadFriendDebts();
      await this.fetchPendingPayments();
      return { success: true, data: payment };
    }
    return { success: false, error: resp.data?.error || "Failed to confirm payment" };
  };

  cancelPayment = async (paymentId) => {
    const resp = await this.apiFetch(`/payments/${paymentId}`, "DELETE", null, true);
    if (resp.ok) {
      // Recargar los pagos del grupo
      // Nota: La respuesta no incluye group_id, asi que usamos loadFriendDebts
      await this.loadFriendDebts();
      await this.fetchPendingPayments();
      return { success: true };
    }
    return { success: false, error: resp.data?.error || "Failed to cancel payment" };
  };

  fetchPendingPayments = async () => {
    const userId = this.store.user?.id;
    if (!userId) return { success: false, error: "User not logged in" };

    const resp = await this.apiFetch(`/users/${userId}/pending-payments`, "GET", null, true);
    if (resp.ok) {
      this.dispatch({
        type: "SET_PENDING_PAYMENTS",
        payload: { received: resp.data.received || [], sent: resp.data.sent || [] }
      });
      return { success: true, data: resp.data };
    }
    return { success: false, error: resp.data?.error || "Failed to fetch pending payments" };
  };
}



export default Actions;