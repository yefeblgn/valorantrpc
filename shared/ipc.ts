export const IPC = {
  windowMinimize: 'window:minimize',
  windowClose: 'window:close',
  appGetVersion: 'app:get-version',
  appQuit: 'app:quit',
  shellOpenExternal: 'shell:open-external',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed',
  stateGet: 'state:get',
  stateChanged: 'state:changed',
  agentsList: 'content:agents',
  inviteRespond: 'invite:respond',
  updateGet: 'update:get',
  updateCheck: 'update:check',
  updateStart: 'update:start',
  updateState: 'update:state'
} as const
