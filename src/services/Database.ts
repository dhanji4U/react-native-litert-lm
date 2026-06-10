import * as SQLite from 'expo-sqlite';

export interface ChatSession {
  id: string;
  title: string;
  updated_at: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync('emi_storage.db');

    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    try {
      await this.db.execAsync(`ALTER TABLE messages ADD COLUMN session_id TEXT DEFAULT 'default'`);
    } catch {
      // Column likely already exists, ignore
    }
    try {
      await this.db.execAsync(`INSERT OR IGNORE INTO sessions (id, title, updated_at) VALUES ('default', 'New Chat', ${Date.now()})`);
    } catch { }

    try {
      // Migrate old 'gemma' messages to 'ai'
      await this.db.execAsync(`UPDATE messages SET sender = 'ai' WHERE sender = 'gemma'`);
    } catch { }

    try {
      // Clean up interrupted AI messages (shows stuck "Thinking...")
      await this.db.execAsync(`DELETE FROM messages WHERE sender = 'ai' AND text = ''`);
    } catch { }
  }

  async getSessions(): Promise<ChatSession[]> {
    if (!this.db) await this.init();
    try {
      return await this.db!.getAllAsync<ChatSession>('SELECT * FROM sessions ORDER BY updated_at DESC');
    } catch (e) {
      console.error('Failed to get sessions:', e);
      return [];
    }
  }

  async createSession(id: string, title: string = 'New Chat') {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync(
        'INSERT INTO sessions (id, title, updated_at) VALUES (?, ?, ?)',
        id, title, Date.now()
      );
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  async updateSessionTimestamp(id: string) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync('UPDATE sessions SET updated_at = ? WHERE id = ?', Date.now(), id);
    } catch { }
  }

  async updateSessionTitle(id: string, title: string) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync('UPDATE sessions SET title = ? WHERE id = ?', title, id);
    } catch { }
  }

  async deleteSession(id: string) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync('DELETE FROM sessions WHERE id = ?', id);
      await this.db!.runAsync('DELETE FROM messages WHERE session_id = ?', id);
    } catch { }
  }

  async loadHistory(sessionId: string): Promise<ChatMessage[]> {
    if (!this.db) await this.init();
    try {
      return await this.db!.getAllAsync<ChatMessage>(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp DESC',
        sessionId
      );
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  }

  async saveMessage(message: ChatMessage) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO messages (id, session_id, sender, text, timestamp) VALUES (?, ?, ?, ?, ?)',
        message.id,
        message.session_id,
        message.sender,
        message.text,
        message.timestamp
      );
      await this.updateSessionTimestamp(message.session_id);
    } catch (e) {
      console.error('Failed to save message:', e);
    }
  }

  async updateMessageText(id: string, newText: string) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync(
        'UPDATE messages SET text = ? WHERE id = ?',
        newText,
        id
      );
    } catch (e) {
      console.error('Failed to update message:', e);
    }
  }

  async deleteMessage(id: string) {
    if (!this.db) await this.init();
    try {
      await this.db!.runAsync('DELETE FROM messages WHERE id = ?', id);
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  }

  async clearHistory() {
    if (!this.db) await this.init();
    await this.db!.execAsync('DELETE FROM messages;');
    await this.db!.execAsync('DELETE FROM sessions;');
  }
}

export const database = new DatabaseService();
