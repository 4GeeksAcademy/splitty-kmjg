const apiUrl = import.meta.env.VITE_BACKEND_URL;

class Actions {
  constructor(state, dispatch) {
    this.state = state;
    this.dispatch = dispatch;
  }

  async apiFetch(endpoint, method = "GET", body = null, isPrivate = true) {
    const token = this.store.token;
    if (!token && isPrivate) {
      console.error("No token");
      return;
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
      const resp = await fetch(apiUrl + endpoint, fetchParams);
      let data = await resp.json();
      return { code: resp.status, ok: resp.ok, data };
    } catch (error) {
      return { code: 0, ok: false, error: error.message, data: null };
    }
  }

  async login(email, password) {
    const resp = await this.apiFetch(
      "/login",
      "POST",
      { email, password },
      false,
    );
    if (!resp.ok) {
      const errorData = await response.json();
      console.error("Login fallido:", errorData.error);
      return false;
    }

    const data = await response.json();

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_email", email);

    this.dispatch({ type: "SET_JWT", payload: data.access_token });
    this.dispatch({ type: "SET_USER", payload: { email: email } });

    return true;
  }

  async register(email, password, ci) {
    const resp = await this.apiFetch(
      "/register",
      "POST",
      { email, password, ci },
      false,
    );
    if (!resp.ok) {
      const errorData = await resp.json();
      console.error("Registro fallido:", errorData.error);
      return false;
    }

    return true;
  }

  async logout() {
    const resp = await this.apiFetch(
      "/logout",
      "POST",
      null,
      true
    );
    if (!resp.ok) {
      console.error("Error al cerrar sesión:", resp.error);
      return;
    }

    localStorage.removeItem("token");

    this.dispatch({ type: "UNSET_USER" });
  }
}

export default Actions;
