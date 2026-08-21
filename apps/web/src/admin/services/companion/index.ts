export type {
  Companion,
  CompanionAvailability,
  CompanionCapabilityKey,
  CompanionMemoryItem,
  CompanionMemoryLayer,
  CompanionPersona,
  CompanionRelationship,
  CompanionResolutionContext,
  CompanionService,
  CompanionSource,
  CompanionStatus,
  CompanionTurnContext,
  CompanionType,
  ResolvedCapability,
} from './CompanionService';

export type { LlmGateway, LlmGatewayRequest, LlmGatewayResponse } from './llmGateway';
export { simulatedLlmGateway, SimulatedLlmGateway } from './llmGateway';
export { hasCapability, resolveCapabilities } from './capabilities';
export { demoCompanionService, DemoCompanionAdapter } from './demoCompanionAdapter';
export type {
  CompanionDataMode,
  CompanionDataService,
  CompanionEngineStatus,
  CompanionState,
} from './CompanionDataService';
export { apiCompanionDataService, ApiCompanionDataAdapter } from './apiCompanionDataAdapter';