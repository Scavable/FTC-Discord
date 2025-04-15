import { Guild, Role } from "discord.js";

export default class RoleMapper {
    private roleMap: Map<string, Role> = new Map();
    private initialized = false;

    constructor(private guild: Guild) {}

    /**
     * Initializes the role map by fetching roles from the API.
     * Should be called once before accessing roles.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const roles = await this.guild.roles.fetch();
            roles?.forEach(role => {
                this.roleMap.set(role.name.toLowerCase(), role);
            });
            this.initialized = true;
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    }

    /**
     * Get the role ID by name (case-insensitive).
     */
    getRoleId(roleName: string): string | null {
        const role = this.roleMap.get(roleName.toLowerCase());
        return role ? role.id : null;
    }

    /**
     * Get the Role object by name (case-insensitive).
     */
    getRole(roleName: string): Role | null {
        return this.roleMap.get(roleName.toLowerCase()) || null;
    }

    /**
     * Check if a role exists in the map.
     */
    hasRole(roleName: string): boolean {
        return this.roleMap.has(roleName.toLowerCase());
    }

    /**
     * Get all roles (useful for debugging or display).
     */
    getAllRoles(): Role[] {
        return Array.from(this.roleMap.values());
    }
}
