// Bild eines Gerichts: echtes Foto (falls der Besitzer eins hochgeladen hat), sonst die gezeichnete Teller-Illustration.
import { useState } from 'react';
import { useApp } from '../app/context';
import { dishImageUrl } from '../lib/dishArt';
import { useDishPhotos } from '../lib/dishPhotos';
import type { Dish } from '../lib/dishes';

export function DishImage({ dish, className = 'dish-img' }: { dish: Dish; className?: string }) {
  const { api } = useApp();
  const photos = useDishPhotos(api.social);
  const [broken, setBroken] = useState(false);
  const photo = !broken ? photos[dish.id] : undefined;
  return (
    <img
      className={`${className}${photo ? ' photo' : ''}`}
      src={photo ?? dishImageUrl(dish, className !== 'dish-hero')}
      alt={photo ? `Foto: ${dish.name}` : ''}
      loading="lazy"
      decoding="async"
      data-photo={photo ? '1' : '0'}
      onError={() => setBroken(true)}
    />
  );
}
