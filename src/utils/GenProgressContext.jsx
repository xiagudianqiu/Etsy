import { createContext, useContext, useState, useCallback } from 'react';

const GenContext = createContext({
  generating: false,
  progressText: '',
  result: null,
  setGenerating: () => {},
  setProgressText: () => {},
  setResult: () => {},
  clearGen: () => {}
});

export function GenProvider({ children }) {
  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);

  const clearGen = useCallback(() => {
    setGenerating(false);
    setProgressText('');
    setResult(null);
  }, []);

  return (
    <GenContext.Provider value={{
      generating, progressText, result,
      setGenerating, setProgressText, setResult, clearGen
    }}>
      {children}
    </GenContext.Provider>
  );
}

export function useGenContext() {
  return useContext(GenContext);
}