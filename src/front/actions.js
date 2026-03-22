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

  fetchGroupBalances = async (groupId) => {
    // Fetch real group data (members) from backend
    const groupResp = await this.apiFetch(`/groups/${groupId}`, "GET", null, true);
    if (!groupResp.ok) {
        return { success: false, error: groupResp.data?.error || "Could not load group." };
    }

    // Fetch real expenses from backend
    const expensesResp = await this.apiFetch(`/groups/${groupId}/expenses`, "GET", null, true);
    
    // Build users map from real members (backend now returns {id, username, email})
    const members = groupResp.data.members || [];
    const usersMap = {};
    members.forEach(m => {
        usersMap[m.id] = { id: m.id, username: m.username };
    });

    // Compute balances from expenses
    const balances = {}; // net balance per user (positive = owed money, negative = owes money)
    members.forEach(m => { balances[m.id] = 0; });

    if (expensesResp.ok) {
        const expenses = expensesResp.data.expenses || [];
        for (const entry of expenses) {
            const expense = entry.expense;
            const participants = entry.participants || [];
            
            // The payer is owed money by participants
            for (const p of participants) {
                const amountOwed = p.amount_owed || 0;
                if (p.user_id !== expense.paid_by) {
                    balances[expense.paid_by] = (balances[expense.paid_by] || 0) + amountOwed;
                    balances[p.user_id] = (balances[p.user_id] || 0) - amountOwed;
                }
            }
        }
    }

    // Compute simplified settlements (greedy algorithm)
    const settlements = [];
    const debtors = []; // people who owe (negative balance)
    const creditors = []; // people who are owed (positive balance)

    for (const [userId, balance] of Object.entries(balances)) {
        if (balance > 0.01) creditors.push({ id: parseInt(userId), amount: balance });
        else if (balance < -0.01) debtors.push({ id: parseInt(userId), amount: -balance });
    }

    // Sort for greedy matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        const transfer = Math.min(debtors[i].amount, creditors[j].amount);
        if (transfer > 0.01) {
            settlements.push({
                from: debtors[i].id,
                to: creditors[j].id,
                amount: Math.round(transfer * 100) / 100
            });
        }
        debtors[i].amount -= transfer;
        creditors[j].amount -= transfer;
        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }

    const rawExpenses = expensesResp.ok ? (expensesResp.data.expenses || []) : [];

    return {
        success: true,
        data: {
            personal_balances: balances,
            settlements,
            users: usersMap,
            expenses: rawExpenses
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