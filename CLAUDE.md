# Claude Instructions for nestjs-clean-architecture

## When Modifying This Codebase

1. ALWAYS preserve the 4-layer Clean Architecture
2. NEVER add framework imports to `domain/` layer
3. NEVER merge DTOs with domain entities
4. ALWAYS use feature folders within layers
5. ALWAYS update barrel exports (`index.ts`) when adding files
6. RUN `pnpm run build` after structural changes

## Refactoring Rules

- Moving files between features: OK
- Moving files between layers: REQUIRES review
- Adding deps to domain: FORBIDDEN
- Changing DI tokens: REQUIRES module updates

## When Creating DTOs

- ALWAYS add `readonly` to every property
- NEVER create mutable DTO fields

## When Throwing Errors

- ALWAYS use enums from `application/shared/errors/`
- NEVER use inline string messages

## When Creating Repository Methods

- ALWAYS return `{ data, count }` for list operations
- ALWAYS accept `FindAllParams` object parameter
