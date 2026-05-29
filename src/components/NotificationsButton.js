import { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { Bell, TriangleAlert, Wallet, Trash2 } from "lucide-react-native";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
const timeAgo = ts => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
};
const ICON = {
  budget_exceeded: TriangleAlert,
  budget_warning: Wallet
};
export default function NotificationsButton() {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    items,
    unread,
    markAllRead,
    clearAll
  } = useNotifications();
  const [open, setOpen] = useState(false);
  useSyncNavBar(open);
  const openSheet = () => {
    setOpen(true);
    markAllRead();
  };
  return <>
      <Pressable onPress={openSheet} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ""}`} style={({
      pressed
    }) => [styles.bellBtn, pressed && {
      opacity: 0.6
    }]}>
        <Bell size={18} color={colors.fg} />
        {unread > 0 && <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{unread > 9 ? "9+" : unread}</Text>
          </View>}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, shadow(2)]} onPress={() => {}}>
            <View style={styles.headRow}>
              <Text style={styles.title}>Notifications</Text>
              {items.length > 0 && <Pressable onPress={clearAll} hitSlop={8} style={({
              pressed
            }) => [styles.clearBtn, pressed && {
              opacity: 0.6
            }]}>
                  <Trash2 size={15} color={colors.fgMuted} />
                  <Text style={styles.clearTxt}>Clear</Text>
                </Pressable>}
            </View>

            {items.length === 0 ? <View style={styles.empty}>
                <Bell size={28} color={colors.fgMuted} />
                <Text style={styles.emptyTxt}>No notifications yet.</Text>
              </View> : <ScrollView style={{
            maxHeight: 380
          }} showsVerticalScrollIndicator={false}>
                {items.map(n => {
              const Icon = ICON[n.type] || Bell;
              const tint = n.type === "budget_exceeded" ? colors.danger : colors.primary;
              return <View key={n.id} style={styles.item}>
                      <View style={[styles.itemIcon, {
                  backgroundColor: `${tint}22`
                }]}>
                        <Icon size={18} color={tint} />
                      </View>
                      <View style={{
                  flex: 1
                }}>
                        <Text style={styles.itemTitle}>{n.title}</Text>
                        {n.body ? <Text style={styles.itemBody}>{n.body}</Text> : null}
                        <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
                      </View>
                    </View>;
            })}
              </ScrollView>}
          </Pressable>
        </Pressable>
      </Modal>
    </>;
}
const makeStyles = colors => StyleSheet.create({
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.bg
  },
  badgeTxt: {
    color: colors.primaryOn,
    fontSize: 9,
    fontFamily: fonts.bold
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 90,
    paddingHorizontal: 16,
    alignItems: "flex-end"
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 16
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  clearTxt: {
    color: colors.fgMuted,
    fontFamily: fonts.medium,
    fontSize: 13
  },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8
  },
  emptyTxt: {
    color: colors.fgMuted,
    fontFamily: fonts.regular
  },
  item: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  itemTitle: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  itemBody: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18
  },
  itemTime: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4
  }
});