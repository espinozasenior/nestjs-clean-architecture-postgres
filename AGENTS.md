# AI Agent Guidelines for nestjs-clean-architecture

## Architectural Constraints (MUST NOT VIOLATE)

1. **4-Layer Separation**: API -> Application -> Domain -> Infrastructure
2. **Domain Purity**: Domain layer has ZERO external dependencies
3. **No DTOs in Domain**: DTOs are API layer concerns only
4. **No Infrastructure in Domain**: Domain defines interfaces, infra implements
5. **Preserve DI Tokens**: Do not change provider tokens in modules
6. **No Public API Changes**: HTTP endpoints remain unchanged
7. **Feature-First Within Layers**: Group by feature inside each layer, not across

## File Organization Rules

- Controllers + DTOs: `api/{feature}/`
- Commands + Handlers + Services: `application/{feature}/`
- Entities + Interfaces: `domain/{feature}/`
- Repositories + ORM Entities: `infrastructure/{feature}/`

## Import Rules

- Use barrel exports: `import { X } from '@domain/auth'`
- Never import infrastructure from domain
- Never import API layer from application/domain
