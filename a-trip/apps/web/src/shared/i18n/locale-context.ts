'use client';

import { createContext } from 'react';
import { DEFAULT_LOCALE, type Locale } from './config';

/** Set once by the root layout from the locale cookie; never changes mid-render. */
export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);
