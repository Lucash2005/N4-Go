import { useEffect, useState } from 'react'
import { loadJSON, saveJSON } from '../utils/storage'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => loadJSON(key, initialValue))

  useEffect(() => {
    saveJSON(key, value)
  }, [key, value])

  return [value, setValue]
}
