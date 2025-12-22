import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  initializeSocket,
  disconnectSocket,
  joinOrganization,
  sendMessage as sendSocketMessage,
  onMessage,
  offMessage,
  onReaction,
  offReaction,
  sendReaction as sendSocketReaction,
  getSocket
} from "@/lib/socket";
import WinterBackground from "@/components/WinterBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Users,
  MessageSquare,
  Lightbulb,
  Pencil,
  Trash2,
  Reply,
  Smile,
  Send,
  Medal,
  Crown,
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
  Plus,
  X,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "@/lib/time";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  avatar_url: string | null;
  completed_tasks: number;
  total_tasks: number;
  completion_rate: number;
}

interface ChatMessage {
  id: string;
  organizationId: string;
  userId: string;
  message: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  user?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  reactions?: MessageReaction[];
  replyTo?: ChatMessage | null;
  attachments?: any[];
}

interface MessageReaction {
  reaction: string;
  userId: string;
  count: number;
}

interface Idea {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  description: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

const emojiOptions = ["👍", "❤️", "😂", "😮", "🎉", "🔥"];

const Team = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeTeam = async () => {
      setLoading(true);
      setError(null);
      try {
        const orgId = await resolveOrganization();
        if (orgId && !orgId.startsWith("11111111-")) {
          setSelectedOrgId(orgId);
          await fetchTeamData(orgId);
          await fetchChatMessages(orgId);
          await fetchIdeas(orgId);
        } else {
          setError("No organization selected. Please select or create an organization first.");
          setTimeout(() => navigate("/dashboard"), 3000);
        }
      } catch (error: any) {
        console.error("Team page error:", error);
        setError(error.message || "Failed to load team data");
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeTeam();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Socket init va org join har safar orgId o‘zgarganda
  useEffect(() => {
    if (!selectedOrgId) return;
    try {
      initializeSocket();
      joinOrganization(selectedOrgId);
    } catch (e) {
      console.error("Socket init error:", e);
    }
  }, [selectedOrgId]);

  // WebSocket listeners
  useEffect(() => {
    if (!selectedOrgId) return;

    const handleNewMessage = (message: any) => {
      // Mapping to ChatMessage format
      const mapped = {
        id: message.id,
        organizationId: message.organizationId,
        userId: message.userId,
        message: message.message,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        isDeleted: Boolean(message.isDeleted),
        user: message.user
          ? {
              firstName: message.user.firstName,
              lastName: message.user.lastName,
              avatarUrl: message.user.avatarUrl,
            }
          : undefined,
        reactions: (message.reactions || []).map((r: any) => ({
          id: r.id,
          userId: r.userId,
          reaction: r.reaction,
        })),
      };
      setChatMessages(prev => {
        if (prev.some(m => m.id === mapped.id)) return prev;
        return [...prev, mapped];
      });
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleReactionUpdate = (message: any) => {
      if (selectedOrgId) {
        fetchChatMessages(selectedOrgId); // Reaksiyalar uchun to‘liq yuklash
      }
    };

    onMessage(handleNewMessage);
    onReaction(handleReactionUpdate);

    return () => {
      offMessage(handleNewMessage);
      offReaction(handleReactionUpdate);
    };
  }, [selectedOrgId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const resolveOrganization = async () => {
    const saved = localStorage.getItem("selectedOrganizationId");
    if (saved) return saved;
    return null;
  };

  const fetchTeamData = async (orgId: string) => {
    try {
      if (!orgId || orgId.startsWith("11111111-")) {
        setTeamMembers([]);
        return;
      }

      const [members, tasks] = await Promise.all([
        api.organizations.members(orgId),
        api.tasks.list({ organizationId: orgId, all: true }),
      ]);

      const statsByUser: Record<string, { total: number; completed: number }> = {};
      (tasks || []).forEach((task: any) => {
        (task.assignments || []).forEach((a: any) => {
          const uid = a.userId;
          if (!uid) return;
          if (!statsByUser[uid]) statsByUser[uid] = { total: 0, completed: 0 };
          statsByUser[uid].total += 1;
          if (task.status === "completed") statsByUser[uid].completed += 1;
        });
      });

      const teamData: TeamMember[] = (members || [])
        .filter((m: any) => m.user)
        .map((m: any) => {
          const uid = m.userId;
          const stat = statsByUser[uid] || { total: 0, completed: 0 };
          const completionRate = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
          return {
            id: uid,
            first_name: m.user.firstName,
            last_name: m.user.lastName,
            position: m.position || "Employee",
            avatar_url: m.user.avatarUrl,
            completed_tasks: stat.completed,
            total_tasks: stat.total,
            completion_rate: completionRate,
          };
        });

      teamData.sort((a, b) => b.completion_rate - a.completion_rate);
      setTeamMembers(teamData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchChatMessages = async (orgId: string) => {
    try {
      if (!orgId || orgId.startsWith("11111111-")) {
        setChatMessages([]);
        return;
      }
      const rows = await api.chat.list(orgId, 200);

      const mapped = (rows || []).map((m: any) => ({
        id: m.id,
        organizationId: m.organizationId,
        userId: m.userId,
        message: m.message,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        isDeleted: Boolean(m.isDeleted),
        user: m.user
          ? {
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              avatarUrl: m.user.avatarUrl,
            }
          : undefined,
        reactions: (m.reactions || []).map((r: any) => ({
          id: r.id,
          userId: r.userId,
          reaction: r.reaction,
        })),
      }));

      setChatMessages(mapped);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchIdeas = async (orgId: string) => {
    try {
      if (!orgId || orgId.startsWith("11111111-")) {
        setIdeas([]);
        return;
      }
      const rows = await api.ideas.list(orgId);
      setIdeas(rows || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrgId || selectedOrgId.startsWith("11111111-")) return;
    const trimmed = newMessage.trim();

    try {
      // SOCKET ULANGANINI TEKSHIRISH
      const sock = getSocket();
      console.log('[CHAT] Yuborishdan oldin socket:', sock);
      try {
        sendSocketMessage({
          organizationId: selectedOrgId,
          message: trimmed,
        });
        console.log('[CHAT] Socket orqali xabar yuborildi:', trimmed);
        setNewMessage("");
      } catch (socketError) {
        console.warn('[CHAT] WebSocket orqali yuborilmadi, REST API orqali yuboriladi:', socketError);
        await api.chat.send({
          organizationId: selectedOrgId,
          message: trimmed,
        });
        toast({
          title: "Success",
          description: "Message sent (REST API)",
        });
        setNewMessage("");
        fetchChatMessages(selectedOrgId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!selectedOrgId || selectedOrgId.startsWith("11111111-")) return;

    try {
      await api.chat.react({ messageId, reaction: emoji });
      if (selectedOrgId) {
        fetchChatMessages(selectedOrgId);
      }
      setShowEmojiPicker(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to react",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await api.chat.delete(id);
      if (selectedOrgId) {
        fetchChatMessages(selectedOrgId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendIdea = async () => {
    if (!newIdeaTitle.trim() || !selectedOrgId) return;

    try {
      await api.ideas.create({
        organizationId: selectedOrgId,
        title: newIdeaTitle.trim(),
        description: newIdeaDescription.trim() || undefined,
      });

      setNewIdeaTitle("");
      setNewIdeaDescription("");
      toast({ title: "Idea submitted!" });
      fetchIdeas(selectedOrgId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-20 relative px-2 md:px-0 flex flex-col items-center">
      <WinterBackground />
      <div className="w-full max-w-xl md:max-w-6xl mx-auto p-4 md:p-6 space-y-6 relative z-10">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                {t("teamPage.title", { defaultValue: "Team" })}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {t("teamPage.subtitle", {
                  defaultValue: "Collaboration, leaderboard, and team communication",
                })}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2 bg-white dark:bg-slate-800 shadow-sm">
            <Users className="h-4 w-4 mr-2" />
            {teamMembers.length} {t("teamPage.members", { defaultValue: "Members" })}
          </Badge>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 md:h-14 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all">
              <Trophy className="h-4 w-4" />
              {t("teamPage.tabs.leaderboard", { defaultValue: "Leaderboard" })}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all">
              <MessageSquare className="h-4 w-4" />
              {t("teamPage.tabs.chat", { defaultValue: "Chat" })}
            </TabsTrigger>
            <TabsTrigger value="ideas" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all">
              <Lightbulb className="h-4 w-4" />
              {t("teamPage.tabs.ideas", { defaultValue: "Ideas" })}
            </TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-3 md:space-y-4 animate-fade-in">
            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 rounded-xl md:rounded-2xl">
              <CardHeader className="border-b border-white/20 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 backdrop-blur-sm rounded-t-xl md:rounded-t-2xl">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {t("teamPage.leaderboardTitle", { defaultValue: "Team Leaderboard" })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 md:pt-6 md:space-y-4">
                {teamMembers.length === 0 ? (
                  <div className="py-16 text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground text-lg">
                      {t("teamPage.leaderboard.empty", { defaultValue: "No team members yet" })}
                    </p>
                  </div>
                ) : (
                  teamMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex flex-col md:flex-row items-center gap-3 md:gap-4 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 animate-slide-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                          {index === 0 && (
                            <Crown className="absolute -top-2 -right-2 h-5 w-5 text-amber-500" />
                          )}
                          {index === 1 && (
                            <Medal className="absolute -top-2 -right-2 h-5 w-5 text-slate-400" />
                          )}
                          {index === 2 && (
                            <Star className="absolute -top-2 -right-2 h-5 w-5 text-amber-700" />
                          )}
                          <div className="text-2xl font-bold text-slate-400 w-8 text-center">
                            #{index + 1}
                          </div>
                        </div>

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.first_name[0]}{member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.position}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Completed</div>
                          <div className="text-xl font-bold text-green-600">
                            {member.completed_tasks}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-xl font-bold">{member.total_tasks}</div>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="text-sm text-muted-foreground">Rate</div>
                          <div className="text-xl font-bold text-primary">
                            {Math.round(member.completion_rate)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4 animate-fade-in">
            <Card className="h-[650px] flex flex-col border-0 shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20">
              <CardHeader className="border-b border-white/20 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {t("teamPage.chat.sectionTitle", { defaultValue: "Team Chat" })}
                    </span>
                  </CardTitle>
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">{teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'} online</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <MessageSquare className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {t("teamPage.chat.empty", { defaultValue: "No messages yet. Start the conversation!" })}
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                    const senderName = msg.user
                      ? `${msg.user.firstName} ${msg.user.lastName}`
                      : "User";

                    return (
                      <div key={msg.id} className="flex items-start gap-3 animate-slide-in" style={{ animationDelay: `${index * 30}ms` }}>
                        <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-800 shadow-md">
                          <AvatarImage src={msg.user?.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-semibold">
                            {senderName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 max-w-[80%]">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">{senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(new Date(msg.createdAt), i18n.language)}
                            </span>
                          </div>
                          <div className="group relative">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{msg.message}</p>
                            </div>

                            {/* Reactions */}
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setShowEmojiPicker(msg.id)}
                              >
                                <Smile className="h-4 w-4" />
                              </Button>

                              {showEmojiPicker === msg.id && (
                                <div className="flex gap-1 bg-white dark:bg-slate-800 border-2 rounded-xl p-2 shadow-xl animate-scale-in">
                                  {emojiOptions.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReaction(msg.id, emoji)}
                                      className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 text-xl transition-all hover:scale-125"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="border-t-2 p-4 bg-white dark:bg-slate-800">
                <div className="flex gap-3">
                  <Input
                    placeholder={t("teamPage.chat.placeholder", { defaultValue: "Type a message..." })}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="flex-1 h-12 px-4 rounded-xl border-2 focus:border-primary"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="space-y-4 animate-fade-in">
            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20">
              <CardHeader className="border-b border-white/20 bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-950/30 dark:to-pink-950/30 backdrop-blur-sm">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                    <Lightbulb className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {t("teamPage.ideas.title", { defaultValue: "Team Ideas" })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Add Idea Form */}
                <div className="p-6 rounded-2xl border border-purple-300/50 dark:border-purple-700/50 bg-gradient-to-br from-purple-50/60 to-pink-50/60 dark:from-purple-950/40 dark:to-pink-950/40 shadow-lg backdrop-blur-sm">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-purple-600" />
                    Share Your Idea
                  </h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="Idea title..."
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Describe your idea..."
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={sendIdea} disabled={!newIdeaTitle.trim()} className="w-full">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Submit Idea
                    </Button>
                  </div>
                </div>

                {/* Ideas List */}
                {ideas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No ideas yet. Be the first!</p>
                ) : (
                  <div className="space-y-4">
                    {ideas.map((idea) => (
                      <div
                        key={idea.id}
                        className="p-6 rounded-xl border border-white/30 dark:border-slate-700/30 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:border-purple-300/50 transition-all backdrop-blur-sm shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={idea.user?.avatarUrl || undefined} />
                              <AvatarFallback>
                                {idea.user?.firstName[0]}{idea.user?.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">
                                {idea.user?.firstName} {idea.user?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeTime(new Date(idea.createdAt), i18n.language)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold mb-2">{idea.title}</h4>
                        {idea.description && (
                          <p className="text-sm text-muted-foreground">{idea.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Team;
