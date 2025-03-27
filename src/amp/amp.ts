class AMP {

    private static instance: AMP; // Singleton instance
    private API_BASE_URL: string = "https://amp.ftc.gg/";
    private readonly username: string = "";
    private readonly password: string = "";
    private readonly token: string = "";
    private readonly rememberMe: boolean = false;
    private SESSIONID: string = "";
    private rememberMeToken: string = "";
    private ID: string = "";

    private instances = [];

    // Private constructor to prevent direct instantiation
    private constructor() {}

    // Static method to get the singleton instance
    public static getInstance(): AMP {
        if (!AMP.instance) {
            AMP.instance = new AMP();
        }
        return AMP.instance;
    }

    public setCredentials(username: string, password: string, token: string, rememberMe: boolean): void {
        this.username = username;
        this.password = password;
        this.token = token;
        this.rememberMe = rememberMe;
    }

    async sendPostRequest(url: string, data: any) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data)
            });

            // Ensure the request was successful
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            // Check if the response has JSON content
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
    
    private isValid(): void{
        if (!this.SESSIONID) {
            throw new Error("Not authenticated. Please login first.");
        }
    }

    //Amp bot login
    async login(instanceId?: string): Promise<void> {
        try {
            const json = {
                username: this.username,
                password: this.password,
                token: this.token,
                rememberMe: this.rememberMe
            };

            let response;
            if(instanceId){
                console.log("Instance Login");
                response = await this.sendPostRequest(`${this.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/Login`, json);
            }
            else
                response = await this.sendPostRequest(`${this.API_BASE_URL}API/Core/Login`, json);

            if (response["success"]) {
                console.log("Login successful:", response);
                this.SESSIONID = response["sessionID"];
                this.rememberMeToken = response["rememberMeToken"];
                this.ID = response["userInfo"]["ID"];
                console.log(this.ID);
            } else {
                console.error("Login failed:", response);
            }
        }catch(error) {
            console.error("Login request failed:", error);
        }
    }

    //Amp bot logout
    async logout(): Promise<void> {
        this.isValid();
        const json = {
            SESSIONID: this.SESSIONID
        };

        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/Logout`, json);
        console.log(response);
    }

    async endUserSession(){
        this.isValid();
        const json = {
            ID: this.ID,
            SESSIONID: this.SESSIONID
        };
        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/EndUserSession`, json);
        console.log(response);
    }

    async getInstances(){
        try {
            this.isValid();
            const json = {
                SESSIONID: this.SESSIONID
            };

            const response = await this.sendPostRequest(`${this.API_BASE_URL}API/ADSModule/GetInstances`, json);

            if (!response || !Array.isArray(response) || !response[0]?.AvailableInstances) {
                throw new Error("Invalid response format for GetInstances.");
            }

            this.instances = response[0]?.AvailableInstances;
            return response[0].AvailableInstances;

        }catch(error){
            console.error("Error fetching instances:", error);
        }
    }

    async getAPISpec(){
        this.isValid();
        const json = {
            SESSIONID: this.SESSIONID
        };

        const response = await this.sendPostRequest(`${this.API_BASE_URL}Core/GetAPISpec`, json);
        console.log(response);
    }

    getSessionID(){}
}

export default AMP;
