import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AvatarWithFallback } from './AvatarWithFallback';
import { usePublicDirectory } from '../hooks/usePublicDirectory';
import { useDirectoryFollowing } from '../hooks/useDirectoryFollowing';
import { PublicDirectoryUser } from '../services/publicDirectoryService';
import { colors } from '../constants/theme';

export default function CommunityDirectory({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const router = useRouter(); const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const directory = usePublicDirectory();
  const users = useMemo(() => directory.profiles.filter(user => user.name.toLocaleLowerCase()
    .includes(search.trim().toLocaleLowerCase())), [directory.profiles, search]);
  const following = useDirectoryFollowing(directory.profiles.map(user => user._id), !favoritesOnly);
  const open = (user: PublicDirectoryUser) => router.push({ pathname: '/user-profile', params: {
    userId: user._id, userName: user.name, userSlug: user.slug || '',
    userAvatar: user.profileImageUrl || user.profilePhoto || user.avatar || '',
  } });
  const follow = async (id: string) => {
    if (!following.owner) { router.push('/auth-options'); return; }
    try { await following.toggle(id); } catch { Alert.alert(t('error', 'Error'), t('follow_error', 'İşlem tamamlanamadı. Tekrar deneyin.')); }
  };
  const footer = <View style={s.footer}>
    {directory.error && <Text testID="community-load-error" style={s.muted}>Profiller yüklenemedi. Yenileyip tekrar deneyin.</Text>}
    {directory.repeatedPage && <Text testID="community-api-limit" style={s.muted}>
      Sunucu ek sayfa sağlamıyor. Dönen {directory.profiles.length} herkese açık profil gösteriliyor.
    </Text>}
    {directory.isFetchingNextPage ? <ActivityIndicator testID="community-loading-more" color={colors.primary} />
      : directory.hasNextPage && <TouchableOpacity testID="community-load-more" style={s.button} onPress={() => directory.fetchNextPage()}>
        <Text style={s.buttonText}>{t('load_more', 'Load More')}</Text>
      </TouchableOpacity>}
    {directory.error && <TouchableOpacity testID="community-retry" style={s.button} onPress={() => directory.refetch()}><Text style={s.buttonText}>{t('retry', 'Retry')}</Text></TouchableOpacity>}
  </View>;
  return <SafeAreaView testID="community-directory" style={s.screen}>
    <View style={s.header}>
      <TouchableOpacity testID="community-back" style={s.touch} onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
      <Text testID="community-title" style={s.title}>{favoritesOnly ? t('favorites_from_users', 'Favorites from Users') : t('community', 'Community')}</Text>
    </View>
    <View style={s.search}>
      <Ionicons name="search" size={20} color={colors.textSecondary} />
      <TextInput testID="community-search" style={s.input} value={search} onChangeText={setSearch}
        placeholder={t('search_users', 'Search users...')} placeholderTextColor={colors.textSecondary} />
      {!!search && <TouchableOpacity testID="community-clear-search" style={s.touch} onPress={() => setSearch('')}><Ionicons name="close" size={20} color={colors.text} /></TouchableOpacity>}
    </View>
    <Text testID="community-public-only" style={[s.muted, s.note]}>Yalnızca herkese açık profiller listelenir.</Text>
    <Text testID="community-loaded-count" style={[s.muted, s.count]}>{directory.profiles.length} profil yüklendi. Arama yüklenen profillerde yapılır.</Text>
    {directory.isLoading ? <ActivityIndicator testID="community-loading" size="large" color={colors.primary} /> :
      <FlatList testID="community-list" data={users} keyExtractor={item => item._id} refreshing={directory.isRefetching}
        onRefresh={() => directory.refetch()} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text testID="community-empty" style={s.muted}>{search ? 'Yüklenen profiller arasında eşleşme yok.' : t('no_users_found', 'No users found')}</Text>}
        ListFooterComponent={footer} renderItem={({ item }) => <TouchableOpacity testID={`community-user-${item._id}`} style={s.row} onPress={() => open(item)}>
          <View testID={`community-avatar-${item._id}`}><AvatarWithFallback uri={item.profileImageUrl || item.profilePhoto || item.avatar} size={52} style={s.avatar} /></View>
          <View style={s.info}><Text testID={`community-name-${item._id}`} style={s.name} numberOfLines={1}>{item.name}</Text>
            {favoritesOnly && <Text style={s.muted}>{item.favorites_count ?? item.favoriteStationsCount ?? 0} {t('favorites', 'Favorites')}</Text>}
          </View>
          {favoritesOnly ? <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} /> : following.owner !== item._id &&
            <TouchableOpacity testID={`community-follow-${item._id}`} style={[s.button, following.values[item._id] && s.following]}
              disabled={following.busy[item._id] || (!!following.owner && following.values[item._id] === undefined)} onPress={() => follow(item._id)}>
              {following.busy[item._id] || (!!following.owner && following.values[item._id] === undefined) ? <ActivityIndicator color={colors.text} /> : <Text style={s.buttonText}>{following.values[item._id] ? t('following', 'Following') : t('follow', 'Follow')}</Text>}
            </TouchableOpacity>}
        </TouchableOpacity>} />}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  title: { fontSize: 24, fontFamily: 'Ubuntu-Bold', color: colors.text, flex: 1 }, touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingLeft: 16, borderRadius: 14, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 48, color: colors.text, fontSize: 16 }, note: { margin: 20 }, list: { paddingHorizontal: 20, paddingBottom: 120 },
  count: { marginHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 }, avatar: { width: 52, height: 52, borderRadius: 26 }, info: { flex: 1 },
  name: { color: colors.text, fontFamily: 'Ubuntu-Medium', fontSize: 16 }, muted: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: colors.text, fontFamily: 'Ubuntu-Medium', fontSize: 14 }, following: { backgroundColor: colors.surface },
  footer: { gap: 16, paddingVertical: 20 },
});