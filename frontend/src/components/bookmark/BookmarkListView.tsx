/**
 * [편안하개 - PetWalk]
 * 내 보관함: 저장된 안심 코스 목록 + 바로 산책 시작 (US-29)
 *
 * 오프라인에서도 AsyncStorage에서 즉시 열람하며, 서버 재탐색 없이 저장된 경로로 산책을 시작한다.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { BookmarkedRoute } from '../../types/bookmark';
import { BookmarkService } from '../../services/bookmarkService';
import { CardWrapper } from '../common/CardWrapper';
import { AppIcon } from '../common/AppIcon';

export interface BookmarkListViewProps {
  readonly onStartBookmark: (bookmark: BookmarkedRoute) => void;
}

export const BookmarkListView: React.FC<BookmarkListViewProps> = ({ onStartBookmark }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setBookmarks(await BookmarkService.getBookmarks());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRemove = async (id: string) => {
    await BookmarkService.removeBookmark(id);
    await reload();
  };

  return (
    <CardWrapper variant="flat" style={{ marginBottom: 16 }}>
      <View style={styles.titleRow}><AppIcon name="star" size={16} color={TOKENS.colors.primary} filled /><Text style={styles.title}>내가 찜한 안심 코스 ({bookmarks.length})</Text></View>
      <Text style={styles.desc}>오프라인에서도 열람할 수 있고, 새 경로 탐색 없이 바로 산책을 시작해요.</Text>

      {!isLoading && bookmarks.length === 0 && (
        <Text style={styles.empty}>코스 프리뷰나 산책 리포트에서 찜하기를 눌러 보관해 보세요.</Text>
      )}

      {bookmarks.map((bm) => (
        <View key={bm.id} style={styles.item}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{bm.title}</Text>
            <TouchableOpacity onPress={() => void handleRemove(bm.id)} accessibilityLabel="즐겨찾기 삭제">
              <Text style={styles.remove}>삭제</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><AppIcon name="map" size={13} color={TOKENS.colors.textMuted} /><Text style={styles.meta}>{bm.totalDistanceKm.toFixed(1)}km</Text></View>
            <View style={styles.metaItem}><AppIcon name="clock" size={13} color={TOKENS.colors.textMuted} /><Text style={styles.meta}>약 {bm.estimatedMinutes}분</Text></View>
            <View style={styles.metaItem}><AppIcon name="mountain" size={13} color={TOKENS.colors.textMuted} /><Text style={styles.meta}>최대 {bm.maxSlopePercent}%</Text></View>
            <View style={styles.metaItem}><AppIcon name="shade" size={13} color={TOKENS.colors.textMuted} /><Text style={styles.meta}>그늘 {bm.shadePercent}%</Text></View>
          </View>
          <View style={styles.tagRow}>
            {bm.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={() => onStartBookmark(bm)} style={styles.startBtn}>
            <View style={styles.startBtnContent}><Text style={styles.startBtnText}>바로 산책 시작</Text><AppIcon name="paw" size={16} color={TOKENS.colors.textWhite} /></View>
          </TouchableOpacity>
        </View>
      ))}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '700', color: TOKENS.colors.textMain },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  desc: { fontSize: 12, color: TOKENS.colors.textMuted, lineHeight: 16, marginTop: 4 },
  empty: { fontSize: 12, color: TOKENS.colors.primaryDark, marginTop: 12, textAlign: 'center' },
  item: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.background,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: TOKENS.colors.textMain, flex: 1 },
  remove: { fontSize: 12, fontWeight: '600', color: TOKENS.colors.textMuted, padding: 4 },
  meta: { fontSize: 11, color: TOKENS.colors.textMuted, lineHeight: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 4, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: TOKENS.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: '600', color: TOKENS.colors.primaryDark },
  startBtn: {
    marginTop: 10,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.primary,
  },
  startBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  startBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
