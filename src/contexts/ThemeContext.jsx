// src/contexts/ThemeContext.jsx
import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';

// 1. Define tus paletas de temas
const themes = {
  darkBlue: { 
    name: 'Oscuro - Azul (Predeterminado)',
    colors: {
      pageBackground: '#121212',
      contentBackground: '#1e1e1e',
      primaryText: '#ffffff',
      secondaryText: '#b0b0b0',
      accent: '#79cdf0',
      accentHover: '#5cb9d7',
      headingColor: '#79cdf0',
      buttonPrimaryBg: '#79cdf0',
      buttonPrimaryText: '#121212',
      buttonSecondaryBg: '#2a2f3b',
      buttonSecondaryText: '#79cdf0',
      dangerBg: '#e74c3c',
      dangerText: '#ffffff',
      successBg: '#28a745',
      successText: '#ffffff',
      borderColor: '#383838',
      inputBackground: '#2c3038',
      inputBorder: '#4a4e54',
      inputText: '#e0e0e0',
      avatarBackground: '#3a3f4b',
      avatarColor: '#79cdf0',
      quickLinkBackground: '#2a2f3b',
      quickLinkBorder: '#3a3f4b',
      quickLinkText: '#79cdf0',
      quickLinkHoverBackground: '#3a3f4b',
    }
  },
  darkOrange: {
    name: 'Oscuro - Naranja Intenso',
    colors: {
      pageBackground: '#000000',
      contentBackground: '#1A1A1A',
      primaryText: '#FFFFFF',
      secondaryText: '#BDBDBD',
      accent: '#FF7A00',
      accentHover: '#E66F00',
      headingColor: '#FF8C00',
      buttonPrimaryBg: '#FF7A00',
      buttonPrimaryText: '#000000',
      buttonSecondaryBg: '#333333',
      buttonSecondaryText: '#FF7A00',
      dangerBg: '#D32F2F',
      dangerText: '#FFFFFF',
      successBg: '#2E7D32',
      successText: '#FFFFFF',
      borderColor: '#333333',
      inputBackground: '#2C2C2C',
      inputBorder: '#555555',
      inputText: '#FFFFFF',
      avatarBackground: '#333333',
      avatarColor: '#FF7A00',
      quickLinkBackground: '#282828',
      quickLinkBorder: '#444444',
      quickLinkText: '#FF8C00',
      quickLinkHoverBackground: '#383838',
    }
  },
  blackWhite: {
    name: 'Negro - Blanco',
    colors: {
      pageBackground: '#000000',
      contentBackground: '#1a1a1a',
      primaryText: '#ffffff',
      secondaryText: '#cccccc',
      accent: '#ffffff',
      accentHover: '#e0e0e0',
      headingColor: '#ffffff',
      buttonPrimaryBg: '#ffffff',
      buttonPrimaryText: '#000000',
      buttonSecondaryBg: '#333333',
      buttonSecondaryText: '#ffffff',
      dangerBg: '#cc0000',
      dangerText: '#ffffff',
      successBg: '#009933',
      successText: '#ffffff',
      borderColor: '#444444',
      inputBackground: '#222222',
      inputBorder: '#555555',
      inputText: '#ffffff',
      avatarBackground: '#333333',
      avatarColor: '#ffffff',
      quickLinkBackground: '#222222',
      quickLinkBorder: '#444444',
      quickLinkText: '#ffffff',
      quickLinkHoverBackground: '#333333',
    }
  },
  grayRed: {
    name: 'Gris - Rojo Clásico',
    colors: {
      // Fondos: Grises oscuros y medios
      pageBackground: '#1C1C1C',         // Fondo de página gris oscuro
      contentBackground: '#424242',     // Contenedores en gris medio (ligeramente más claro que page)

      // Textos: Alto contraste
      primaryText: '#FFFFFF',           // Texto principal blanco
      secondaryText: '#E0E0E0',         // Texto secundario gris muy claro

      // Acentos Rojos: Intensos y claros
      accent: '#D32F2F',               // Rojo principal (Material Design Red 700)
      accentHover: '#B71C1C',          // Rojo más oscuro para hover (Material Design Red 900)
      headingColor: '#E53935',          // Rojo para encabezados (Material Design Red 600)

      // Botones
      buttonPrimaryBg: '#D32F2F',       // Botón primario con fondo rojo
      buttonPrimaryText: '#FFFFFF',     // Texto blanco sobre botón rojo
      
      buttonSecondaryBg: '#616161',     // Botón secundario con fondo gris oscuro (Material Design Grey 700)
      buttonSecondaryText: '#FFFFFF',   // Texto blanco sobre botón secundario (o rojo: '#FFCDD2')

      // Estados (Peligro, Éxito)
      dangerBg: '#D32F2F',             // El mismo rojo principal para peligro
      dangerText: '#FFFFFF',
      successBg: '#388E3C',             // Verde oscuro para éxito (Material Design Green 700)
      successText: '#FFFFFF',

      // Bordes y Entradas
      borderColor: '#616161',           // Bordes en gris medio/oscuro
      inputBackground: '#424242',       // Fondo de inputs igual a contentBackground o un poco más oscuro
      inputBorder: '#757575',           // Borde de inputs (Material Design Grey 600)
      inputText: '#FFFFFF',

      // Componentes UI Específicos
      avatarBackground: '#616161',       // Fondo para avatares
      avatarColor: '#FFCDD2',            // Color del texto/icono del avatar (rojo pálido para contraste)

      quickLinkBackground: '#424242',   // Fondo para accesos rápidos
      quickLinkBorder: '#616161',       // Borde para accesos rápidos
      quickLinkText: '#FFFFFF',          // Texto blanco (el contenedor ya es gris)
      quickLinkHoverBackground: '#505050',// Hover para accesos rápidos (un gris más oscuro)
    }
  },
  blackGreen: {
    name: 'Negro - Verde Esmeralda',
    colors: {
      // Fondos: Negro y grises muy oscuros
      pageBackground: '#000000',         // Fondo de página negro puro
      contentBackground: '#1B1B1B',     // Contenedores en gris casi negro

      // Textos: Alto contraste
      primaryText: '#FFFFFF',           // Texto principal blanco
      secondaryText: '#A7D7A9',         // Texto secundario verde pálido/desaturado

      // Acentos Verdes: Vibrantes y elegantes
      accent: '#2E7D32',               // Verde principal (oscuro y elegante, Material Design Green 800)
      accentHover: '#1B5E20',          // Verde más oscuro para hover (Material Design Green 900)
      headingColor: '#4CAF50',          // Verde más brillante para encabezados (Material Design Green 500)

      // Botones
      buttonPrimaryBg: '#4CAF50',       // Botón primario con fondo verde brillante
      buttonPrimaryText: '#FFFFFF',     // Texto blanco sobre botón verde
      
      buttonSecondaryBg: '#333333',     // Botón secundario con fondo gris oscuro
      buttonSecondaryText: '#81C784',   // Texto verde claro sobre botón secundario (Material Design Green 300)

      // Estados (Peligro, Éxito)
      dangerBg: '#D32F2F',             // Rojo para peligro
      dangerText: '#FFFFFF',
      successBg: '#2E7D32',             // El mismo verde principal para éxito
      successText: '#FFFFFF',

      // Bordes y Entradas
      borderColor: '#333333',           // Bordes sutiles en gris oscuro
      inputBackground: '#2C2C2C',       // Fondo de inputs gris oscuro
      inputBorder: '#555555',           // Borde de inputs
      inputText: '#FFFFFF',

      // Componentes UI Específicos
      avatarBackground: '#333333',       // Fondo para avatares
      avatarColor: '#81C784',            // Color del texto/icono del avatar (verde claro)

      quickLinkBackground: '#282828',   // Fondo para accesos rápidos (gris oscuro)
      quickLinkBorder: '#444444',       // Borde para accesos rápidos
      quickLinkText: '#66BB6A',          // Texto verde para accesos rápidos (Material Design Green 400)
      quickLinkHoverBackground: '#383838',// Hover para accesos rápidos
    }
  }
};

const defaultThemeName = 'darkBlue'; // Puedes cambiar el tema por defecto si lo deseas

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(() => {
    const storedTheme = localStorage.getItem('appTheme');
    return storedTheme && themes[storedTheme] ? storedTheme : defaultThemeName;
  });

  const currentThemeColors = useMemo(() => themes[themeName].colors, [themeName]);

  useEffect(() => {
    localStorage.setItem('appTheme', themeName);
    document.body.style.backgroundColor = currentThemeColors.pageBackground;
    document.body.style.color = currentThemeColors.primaryText;

    return () => {
      // Opcional: Lógica de limpieza si es necesario al desmontar el ThemeProvider global,
      // aunque usualmente no es crítico si siempre hay un tema aplicado.
    };
  }, [themeName, currentThemeColors]);

  const changeTheme = (newThemeName) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentThemeColors, themeName, changeTheme, availableThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);