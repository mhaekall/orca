import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MediaDetailTemplate } from '../../components/media-detail/MediaDetailTemplate';

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams();
  return <MediaDetailTemplate id={id as string} mediaType="anime" />;
}
