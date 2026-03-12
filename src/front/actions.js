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
        console.error("Token expirado o inválido. Limpiando sesión...");
        
       
        localStorage.removeItem("token");
        localStorage.removeItem("user_email");
        localStorage.removeItem("token_timestamp");
        this.dispatch({ type: "UNSET_USER" });
        
      
        window.location.href = "/login";
        
        return { code: resp.status, ok: false, error: "Sesión expirada", data: null };
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

  createGroup = async(formData) => {
    const resp = await this.apiFetch("/groups","POST",formData,true);

    if(!resp.ok){
      console.error("Error al crear grupo:",resp.error || resp.data?.error);
      return{success:false,error:resp.error || resp.data?.error || "Error al crear el grupo"}
    }
    return{success:true,data:resp.data};
  }
}

export default Actions;
