import https from 'https'
import axios, { type AxiosInstance } from 'axios'



const insecureAgent = new https.Agent({ rejectUnauthorized: false })


export const riotClient: AxiosInstance = axios.create({
  httpsAgent: insecureAgent,
  
  validateStatus: () => true,
  timeout: 6000
})


export const webClient: AxiosInstance = axios.create({
  validateStatus: () => true,
  timeout: 8000
})
