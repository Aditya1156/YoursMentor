import mongoose from 'mongoose'
import { env } from './env.js'

let memoryServer: { stop: () => Promise<boolean> } | null = null

export async function connectDb(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true)

  if (!uri) {
    if (env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI must be set in production')
    }
    // Local dev without Atlas: spin up a throwaway in-memory database so the
    // whole auth flow works offline. Data vanishes on restart.
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mem = await MongoMemoryServer.create()
    memoryServer = mem
    uri = mem.getUri()
    console.warn('MONGODB_URI not set — using a temporary in-memory database.')
    console.warn('Data will be lost when this process stops.')
  }

  await mongoose.connect(uri)
  console.log('MongoDB connected')
}

export async function disconnectDb() {
  await mongoose.disconnect()
  await memoryServer?.stop()
  memoryServer = null
}
