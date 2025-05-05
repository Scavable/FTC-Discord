import { Pool, PoolClient } from "pg";
import { config } from "../Config";

// Create a connection pool
const pool = new Pool({
  user: config.POSTGRES_USER,
  host: config.POSTGRES_HOST, // or the host address for your database
  database: config.POSTGRES_DB,
  password: config.POSTGRES_PASSWORD,
  port: Number(config.POSTGRES_PORT), // Default port for PostgreSQL
});

export default class Database {

  static async createUserTable(){
    const client: PoolClient = await pool.connect();
    try{
      const result = await client.query("Create Table If Not Exists users(discord_id BigInt PRIMARY KEY, discord_username Varchar(32), minecraft_uuid UUID, minecraft_username Varchar(16))");
    }catch(error){
      console.error(error);
    }
    finally{
      client.release();
    }
    await pool.end();
  }

  /**
   * Runs a simple query.
   */
  static async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client: PoolClient = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release(); // Always release the client
    }
  }

  /**
   * Initialize database tables (can be executed during setup).
   */
  static async initializeTables() {
    try {
      // Example table creation queries
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          server_id TEXT NOT NULL
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS servers (
          id SERIAL PRIMARY KEY,
          server_id TEXT NOT NULL,
          server_name TEXT NOT NULL,
          admin_id TEXT
        )
      `);

      console.log("Database tables initialized successfully!");
    } catch (error) {
      console.error("Error initializing database tables:", error);
    }
  }
}