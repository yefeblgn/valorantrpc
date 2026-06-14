

export const IPC = {
  
  windowMinimize: 'window:minimize',
  windowClose: 'window:close',
  windowHide: 'window:hide',
  
  appGetVersion: 'app:get-version',
  shellOpenExternal: 'shell:open-external',
  
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed', 
  
  stateGet: 'state:get',
  stateChanged: 'state:changed', 
  
  agentsList: 'content:agents',
  
  updateCheck: 'update:check',
  updateStart: 'update:start',
  updateState: 'update:state', 
  
  appQuit: 'app:quit'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
