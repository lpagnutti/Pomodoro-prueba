# Documentación del Proyecto: Pomodoro Focus

Esta aplicación es un gestor de tareas basado en la técnica Pomodoro, diseñado para mejorar la productividad mediante sesiones de trabajo enfocadas y descansos programados.

## Arquitectura
La aplicación es una **Single Page Application (SPA)** construida con:
*   **Frontend:** React (Vite) con TypeScript.
*   **Estilos:** Tailwind CSS.
*   **Backend/Persistencia:** Firebase (Firestore para base de datos en tiempo real, Firebase Auth para autenticación).
*   **Notificaciones:** Service Worker para notificaciones push.

## Estructura de Archivos
*   `/src/main.tsx`: Punto de entrada de la aplicación. Registra el Service Worker.
*   `/src/App.tsx`: Componente raíz, maneja la navegación y el estado de autenticación.
*   `/src/AppContext.tsx`: **Núcleo de la aplicación**. Gestiona el estado global (tareas, temporizador, estadísticas), la autenticación y la sincronización con Firebase.
*   `/src/types.ts`: Define las interfaces y tipos de datos del proyecto.
*   `/src/firebase.ts`: Inicializa Firebase.
*   `/public/sw.js`: Service Worker para notificaciones.

## Funcionalidades Clave

### 1. Sistema de Pomodoro
*   Gestionado en `AppContext.tsx`.
*   Alterna entre modos `WORK` y `BREAK`.
*   Utiliza `useEffect` para el temporizador y notificaciones del navegador al finalizar cada ciclo.

### 2. Persistencia de Datos (Firebase)
*   La aplicación se sincroniza en tiempo real con Firestore.
*   Las tareas, sesiones, ideas y estadísticas se guardan bajo la colección `users/{userId}/...`.
*   Se ha implementado una lógica de limpieza de valores `undefined` para evitar errores de escritura en Firestore.

### 3. Sistema de XP y Niveles
*   Se gana XP al completar sesiones de trabajo (`WORK`).
*   Fórmula: `(duración_sesión / 25) * XP_POR_POMODORO`.
*   El nivel se calcula automáticamente basándose en el XP total acumulado.

### 4. Notificaciones
*   Se solicita permiso al usuario al cargar la app.
*   Al finalizar un Pomodoro o descanso, se dispara una notificación visual (`new Notification()`).
*   El Service Worker (`sw.js`) está preparado para manejar eventos `push`.

## Consideraciones de Seguridad
*   La seguridad de los datos está gestionada por `firestore.rules`.
*   Se recomienda revisar y endurecer estas reglas antes de un despliegue masivo.
