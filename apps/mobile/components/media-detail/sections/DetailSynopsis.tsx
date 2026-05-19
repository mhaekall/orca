import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatSynopsis } from '../../../lib/utils';

export const DetailSynopsis = React.memo(({ synopsis }: { synopsis: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const desc = formatSynopsis(synopsis || "");

  return (
    <View style={styles.synopsisSection}>
      <Text style={styles.sectionTitle}>Sinopsis</Text>
      <Text style={styles.synopsisText} onPress={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? desc : (desc.length > 130 ? `${desc.substring(0, 130).trim()}... ` : desc)}
        {!isExpanded && desc.length > 130 && (
          <Text style={styles.expandButtonText}>Baca Selengkapnya</Text>
        )}
      </Text>
      {isExpanded && (
        <Pressable onPress={() => setIsExpanded(false)} style={styles.expandButton}>
          <Text style={styles.expandButtonText}>Sembunyikan</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  synopsisSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  synopsisText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '400',
  },
  expandButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '700',
  },
});
