'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import styles from '../styles/image-lightbox.module.css';

export interface LightboxImage {
  id: string;
  url: string;
}

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
  alt,
}: {
  images: LightboxImage[];
  /** null closes the lightbox. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  alt: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // Set when the index change originated from the scroller itself, so the sync
  // effect does not scroll the strip back on top of the user's own gesture.
  const fromScrollRef = React.useRef(false);
  // The very first positioning after opening must not animate.
  const firstSyncRef = React.useRef(true);
  const open = index !== null;

  const goTo = React.useCallback(
    (next: number) => {
      if (next < 0 || next >= images.length) return;
      onIndexChange(next);
    },
    [images.length, onIndexChange],
  );

  React.useEffect(() => {
    if (!open) firstSyncRef.current = true;
  }, [open]);

  // Keep the strip aligned whenever the index changes from outside the scroller
  // (opening at a photo, arrow buttons, keys, thumbnails).
  React.useEffect(() => {
    if (index === null) return;
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;
    const behavior = firstSyncRef.current ? 'auto' : 'smooth';
    firstSyncRef.current = false;
    el.scrollTo({ left: index * el.clientWidth, behavior });
  }, [index]);

  // `react-remove-scroll` (used by Radix Dialog) cancels vertical wheel events
  // over a horizontal-only scroller, so the wheel is wired up by hand: one
  // notch steps one photo, with a cooldown so momentum does not skip several.
  const wheelLockRef = React.useRef(false);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !open) return;

    let accumulated = 0;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      if (wheelLockRef.current) return;

      accumulated += delta;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulated = 0;
      }, 200);

      if (Math.abs(accumulated) < 30) return;
      const step = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      wheelLockRef.current = true;
      setTimeout(() => {
        wheelLockRef.current = false;
      }, 350);

      const current = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      goTo(current + step);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      clearTimeout(resetTimer);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [open, goTo]);

  // Touch swipes and trackpad panning move the strip natively; report back
  // whichever slide ended up centred.
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || index === null || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next === index || next < 0 || next >= images.length) return;
    fromScrollRef.current = true;
    onIndexChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (index === null) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} onKeyDown={handleKeyDown}>
          <Dialog.Title className={styles.srOnly}>{alt} photos</Dialog.Title>
          <Dialog.Description className={styles.srOnly}>
            Browse photos of {alt}. Use the arrow keys, the scroll wheel or the arrow buttons to move
            between images.
          </Dialog.Description>

          <div className={styles.topBar}>
            <span className={styles.counter}>
              {index !== null ? index + 1 : 0} / {images.length}
            </span>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeBtn} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className={styles.viewport}>
            <div className={styles.scroller} ref={scrollerRef} onScroll={handleScroll}>
              {images.map((image) => (
                <div key={image.id} className={styles.slide}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={alt} className={styles.slideImage} draggable={false} />
                </div>
              ))}
            </div>

            {index !== null && index > 0 ? (
              <button
                type="button"
                className={cn(styles.navBtn, styles.navPrev)}
                onClick={() => goTo(index - 1)}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}
            {index !== null && index < images.length - 1 ? (
              <button
                type="button"
                className={cn(styles.navBtn, styles.navNext)}
                onClick={() => goTo(index + 1)}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className={styles.thumbStrip}>
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(styles.thumb, i === index && styles.thumbActive)}
                  aria-label={`Go to photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className={styles.thumbImage} />
                </button>
              ))}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
