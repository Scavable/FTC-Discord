class AMP {
    private static instance: AMP | null = null;
    private readonly API_BASE_URL: string = "https://amp.ftc.gg/";
    private readonly username: string;
    private readonly password: string;
    private readonly token: string;
    private readonly rememberMe: boolean;
    private SESSIONID: string = "";
    private rememberMeToken: string = "";
    private ID: string = "";

    private instances = [];

    // Private constructor to enforce singleton pattern
    private constructor(username: string, password: string, token: string = "", rememberMe: boolean = false) {
        this.username = username;
        this.password = password;
        this.token = token;
        this.rememberMe = rememberMe;
    }

    // Singleton accessor with required parameters
    public static getInstance(username?: string, password?: string, token: string = "", rememberMe: boolean = false): AMP {
        if (!AMP.instance) {
            if (!username || !password) {
                throw new Error("AMP instance not initialized. Credentials required.");
            }
            AMP.instance = new AMP(username, password, token, rememberMe);
        }
        return AMP.instance;
    }

    private async sendPostRequest(url: string, data: any) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                return await response.json();
            } else {
                throw new Error("Invalid response format. Expected JSON.");
            }
        } catch (error) {
            throw new Error(`Request to ${url} failed: ${error}`);
        }
    }

    private isValid(): void {
        if (!this.SESSIONID) {
            throw new Error("Not authenticated. Please login first.");
        }
    }

    // AMP bot login
    async login(instanceId?: string): Promise<void> {
        try {
            const json = {
                username: this.username,
                password: this.password,
                token: this.token,
                rememberMe: this.rememberMe
            };

            const response = await this.sendPostRequest(
                instanceId
                    ? `${this.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/Login`
                    : `${this.API_BASE_URL}API/Core/Login`,
                json
            );

            if (response["success"]) {
                console.log("Login successful:", response);
                this.SESSIONID = response["sessionID"];
                this.rememberMeToken = response["rememberMeToken"];
                this.ID = response["userInfo"]["ID"];
            } else {
                console.error("Login failed:", response);
            }
        } catch (error) {
            console.error("Login request failed:", error);
        }
    }

    async logout(): Promise<void> {
        this.isValid();
        const json = { SESSIONID: this.SESSIONID };
        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/Logout`, json);
        console.log(response);
    }

    async endUserSession(): Promise<void> {
        this.isValid();
        const json = { ID: this.ID, SESSIONID: this.SESSIONID };
        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/EndUserSession`, json);
        console.log(response);
    }

    async getServers() {
        try {
            this.isValid();
            const json = { SESSIONID: this.SESSIONID };
            const response = await this.sendPostRequest(`${this.API_BASE_URL}API/ADSModule/GetInstances`, json);

            if (!response || !Array.isArray(response) || !response[0]?.AvailableInstances) {
                throw new Error("Invalid response format for GetInstances.");
            }

            this.instances = response[0]?.AvailableInstances;
            return this.instances;
        } catch (error) {
            console.error("Error fetching instances:", error);
        }
    }

    async getAPISpec(): Promise<void> {
        this.isValid();
        const json = { SESSIONID: this.SESSIONID };
        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/GetAPISpec`, json);
        console.log(response);
    }

    public getSessionID(): string {
        return this.SESSIONID;
    }
}

export default AMP;
