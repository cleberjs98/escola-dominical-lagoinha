# Copilot Instructions - Escola Dominical Lagoinha

## Project Overview
This is a React Native mobile app + PWA for managing Sunday School (Escola Dominical) at Igreja Lagoinha Dublin. Built with Expo, TypeScript, and Firebase backend (planned).

## Tech Stack & Architecture

### Core Framework
- **Expo SDK ~54** with React Native 0.81.5 and React 19.1
- **Expo Router ~6** for file-based routing with typed routes enabled
- **TypeScript** with strict mode (`strict: true`)
- **React Native Web** for PWA deployment (target: Vercel)

### Key Expo Features Enabled
- `newArchEnabled: true` - New React Native architecture
- `typedRoutes: true` - Type-safe routing
- `reactCompiler: true` - React Compiler experimental feature

### Navigation Structure
- **File-based routing** via Expo Router in `app/` directory
- Tab navigation: `app/(tabs)/_layout.tsx` with Home and Explore tabs
- Modal support: `app/modal.tsx` with presentation mode
- Root layout: `app/_layout.tsx` handles theme provider and status bar

### Theme System
- Light/dark mode support via `@react-navigation/native` themes
- Colors centralized in `constants/theme.ts`
- Themed components pattern: `ThemedView`, `ThemedText` use `useThemeColor` hook
- Custom hooks: `use-color-scheme.ts` (re-exports RN's useColorScheme), `use-theme-color.ts`

### Component Patterns
- **Themed components**: All UI components accept `lightColor`/`darkColor` props
- **Icon system**: `IconSymbol` component (iOS SF Symbols via expo-symbols)
- **Haptic feedback**: Tab bar uses `HapticTab` wrapper with expo-haptics
- **Collapsible**: Reusable `Collapsible` component in `components/ui/`

### Project Organization
```
app/           - File-based routes (Expo Router)
components/    - Reusable components
  ui/          - UI primitives (icon-symbol, collapsible)
constants/     - Theme constants (Colors, Fonts)
contexts/      - (Empty) React contexts will go here
hooks/         - Custom hooks (theme, color scheme)
lib/           - (Empty) Firebase client, utilities will go here
types/         - (Empty) TypeScript types/interfaces
utils/         - (Empty) Helper functions
docs/          - Project planning docs (PLANO-PROJETO-ESCOLA-DOMINICAL.md)
```

### Path Aliases
- Use `@/*` imports (configured in tsconfig.json)
- Example: `import { Colors } from '@/constants/theme'`

## Development Workflow

### Commands
- `npm start` - Start Expo dev server
- `npm run android` - Open on Android emulator
- `npm run ios` - Open on iOS simulator
- `npm run web` - Open in web browser
- `npm run lint` - Run ESLint (expo config)
- `npm run reset-project` - Move starter code to app-example, create blank app/

### Building for Web/PWA
- Web output: `static` (configured in app.json)
- Deploy target: Vercel
- PWA features: custom splash screen, favicon, adaptive icons

## Firebase Architecture (Planned - Not Yet Implemented)

### Backend (Firebase)
- **Authentication**: Email/password, custom claims for roles/status
- **Firestore**: Main database with RLS-like security rules
- **Storage**: File uploads (PDFs, videos, images)
- **Cloud Functions**: Backend logic, triggers, notifications

### Data Model (Firestore Schema)
**Collection: `users`**
```typescript
{
  id: string
  nome: string
  email: string
  telefone: string
  data_nascimento: string
  papel: 'aluno' | 'professor' | 'coordenador' | 'administrador'
  status: '' | 'pendente' | 'aprovado' | 'rejeitado'
  aprovado_por_id?: string
  aprovado_em?: Timestamp
  alterado_por_id?: string
  alterado_em?: Timestamp
  papel_anterior?: string
  motivo_rejeicao?: string
  created_at: Timestamp
  updated_at: Timestamp
}
```

### Security Model
- **Custom claims** for role-based access control
- **Status workflow**: empty → pendente → aprovado/rejeitado
- **Approval hierarchy**: 
  - Coordenadores approve alunos/professores
  - Administradores approve coordenadores + all others

## Implementation Phases (from docs/PLANO-PROJETO-ESCOLA-DOMINICAL.md)

**Phase 1: Foundation** - Set up Firebase, types, client, error handling
**Phase 2: Authentication** - Auth context, login/signup/profile completion, pending status screen
**Phase 3: Roles & Permissions** - Firestore rules, approval workflows, user management
**Phase 4+**: Classes, devotionals, news, materials, notifications, admin panel

## Coding Conventions

### TypeScript
- Always use strict typing
- Define interfaces for all data models in `types/`
- Use enums for fixed value sets (roles, statuses)

### Component Naming
- Use PascalCase for component files
- Use kebab-case for non-component files
- Prefix themed components with "Themed" (ThemedView, ThemedText)

### Styling
- StyleSheet.create() for component styles
- Use theme-aware colors from `constants/theme.ts`
- Support both light and dark modes

### Imports
- Use `@/` path alias
- Group imports: React → third-party → local components → hooks → constants → types

## Critical Files
- `app.json` - Expo config (plugins, experiments, platform settings)
- `tsconfig.json` - Path aliases, strict mode
- `constants/theme.ts` - Color and font definitions
- `docs/PLANO-PROJETO-ESCOLA-DOMINICAL.md` - Complete project spec (in Portuguese)

## Notes for AI Agents
- **Firebase is NOT YET IMPLEMENTED** - lib/, contexts/, types/, utils/ are empty placeholders
- Follow the phased approach from PLANO-PROJETO-ESCOLA-DOMINICAL.md when implementing features
- Always maintain type safety and strict TypeScript compliance
- Keep the app functional at each phase (don't break existing functionality)
- Use Expo's built-in tools (expo-image, expo-symbols, expo-haptics) over third-party alternatives
- Web PWA is a first-class target alongside mobile platforms
