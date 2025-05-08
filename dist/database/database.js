import{a as r}from"../chunk-X2FHZWKL.js";import{Pool as o}from"pg";var t=new o({user:r.POSTGRES_USER,host:r.POSTGRES_HOST,database:r.POSTGRES_DB,password:r.POSTGRES_PASSWORD,port:Number(r.POSTGRES_PORT)}),s=class{static async createUserTable(){let e=await t.connect();try{let a=await e.query("Create Table If Not Exists users(discord_id BigInt PRIMARY KEY, discord_username Varchar(32), minecraft_uuid UUID, minecraft_username Varchar(16))")}catch(a){console.error(a)}finally{e.release()}await t.end()}static async query(e,a){let i=await t.connect();try{return(await i.query(e,a)).rows}finally{i.release()}}static async initializeTables(){try{await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          server_id TEXT NOT NULL
        )
      `),await this.query(`
        CREATE TABLE IF NOT EXISTS servers (
          id SERIAL PRIMARY KEY,
          server_id TEXT NOT NULL,
          server_name TEXT NOT NULL,
          admin_id TEXT
        )
      `),console.log("Database tables initialized successfully!")}catch(e){console.error("Error initializing database tables:",e)}}};export{s as default};
