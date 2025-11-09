import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, MessageSquare, Lightbulb, MoreVertical, Pencil, Trash2, Reply, Smile, Paperclip, Send, Image, FileText, Video, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  avatar_url: string | null;
  completed_tasks: number;
  total_tasks: number;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  reactions?: MessageReaction[];
  reply_to?: ChatMessage | null;
  attachments?: MessageAttachment[];
}

interface MessageReaction {
  reaction: string;
  user_id: string;
  count: number;
}

interface MessageAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

const Team = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editIdeaTitle, setEditIdeaTitle] = useState("");
  const [editIdeaDescription, setEditIdeaDescription] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeTeam = async () => {
      await checkAuth();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      const orgId = localStorage.getItem("selectedOrganizationId");
      setSelectedOrgId(orgId);
      if (orgId) {
        fetchTeamData(orgId);
        fetchChatMessages(orgId);
        fetchIdeas(orgId);
        subscribeToChat(orgId);
        subscribeToIdeas(orgId);
        subscribeToTyping(orgId);
      }
    };
    initializeTeam();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTeamData = async (orgId: string) => {
    try {
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, first_name, last_name, position, avatar_url)")
        .eq("organization_id", orgId);

      if (!members) return;

      const teamData = await Promise.all(
        members
          .filter(m => m.profiles)
          .map(async (member: any) => {
            const profile = member.profiles;
            const { data: assignments } = await supabase
              .from("task_assignments")
              .select("task_id")
              .eq("user_id", profile.id);

            const taskIds = assignments?.map(a => a.task_id) || [];
            
            const { data: tasks } = await supabase
              .from("tasks")
              .select("status")
              .in("id", taskIds);

            const completedCount = tasks?.filter(t => t.status === "completed").length || 0;

            return {
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              position: profile.position,
              avatar_url: profile.avatar_url,
              completed_tasks: completedCount,
              total_tasks: tasks?.length || 0,
            };
          })
      );

      teamData.sort((a, b) => b.completed_tasks - a.completed_tasks);
      setTeamMembers(teamData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_chat")
        .select(`
          id,
          user_id,
          message,
          created_at,
          edited_at,
          is_deleted,
          profiles(first_name, last_name, avatar_url)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch reactions, replies, and attachments for each message
      const messagesWithDetails = await Promise.all(
        (data || []).map(async (msg) => {
          const [reactionsData, repliesData, attachmentsData] = await Promise.all([
            supabase
              .from("organization_chat_reactions")
              .select("id, reaction, user_id")
              .eq("message_id", msg.id),
            supabase
              .from("organization_chat_replies")
              .select("reply_to_message_id")
              .eq("message_id", msg.id)
              .single(),
            supabase
              .from("organization_chat_attachments")
              .select("*")
              .eq("message_id", msg.id)
          ]);

          // Group reactions by emoji
          const reactionsMap = new Map<string, { reaction: string; user_id: string; count: number }>();
          reactionsData.data?.forEach(r => {
            const existing = reactionsMap.get(r.reaction);
            if (existing) {
              existing.count++;
            } else {
              reactionsMap.set(r.reaction, { reaction: r.reaction, user_id: r.user_id, count: 1 });
            }
          });

          let replyTo = null;
          if (repliesData.data?.reply_to_message_id) {
            const { data: replyMsg } = await supabase
              .from("organization_chat")
              .select("id, message, user_id, profiles(first_name, last_name)")
              .eq("id", repliesData.data.reply_to_message_id)
              .single();
            replyTo = replyMsg;
          }

          return {
            ...msg,
            reactions: Array.from(reactionsMap.values()),
            reply_to: replyTo,
            attachments: attachmentsData.data || []
          };
        })
      );

      setChatMessages(messagesWithDetails);
    } catch (error: any) {
      console.error("Error fetching chat:", error);
    }
  };

  const subscribeToChat = (orgId: string) => {
    const channel = supabase
      .channel(`org-chat-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_chat",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchChatMessages(orgId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_chat_reactions"
        },
        () => {
          fetchChatMessages(orgId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTyping = (orgId: string) => {
    const channel = supabase
      .channel(`org-typing-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_chat_typing",
          filter: `organization_id=eq.${orgId}`,
        },
        async () => {
          const { data } = await supabase
            .from("organization_chat_typing")
            .select("user_id")
            .eq("organization_id", orgId)
            .gte("last_typed_at", new Date(Date.now() - 3000).toISOString());
          
          setTypingUsers(new Set(data?.map(t => t.user_id).filter(id => id !== currentUserId) || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchIdeas = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_ideas")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = data.map(idea => idea.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
        
        const ideasWithProfiles = data.map(idea => ({
          ...idea,
          profiles: profilesMap.get(idea.user_id) || {
            first_name: "Unknown",
            last_name: "User",
            avatar_url: null,
          },
        }));
        
        setIdeas(ideasWithProfiles);
      } else {
        setIdeas([]);
      }
    } catch (error: any) {
      console.error("Error fetching ideas:", error);
    }
  };

  const subscribeToIdeas = (orgId: string) => {
    const channel = supabase
      .channel(`org-ideas-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_ideas",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchIdeas(orgId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = async () => {
    if (!selectedOrgId || !currentUserId) return;

    await supabase
      .from("organization_chat_typing")
      .upsert({
        organization_id: selectedOrgId,
        user_id: currentUserId,
        last_typed_at: new Date().toISOString()
      });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedOrgId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newMsg, error } = await supabase
        .from("organization_chat")
        .insert({
          organization_id: selectedOrgId,
          user_id: user.id,
          message: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // If replying, create reply link
      if (replyingTo && newMsg) {
        await supabase.from("organization_chat_replies").insert({
          message_id: newMsg.id,
          reply_to_message_id: replyingTo.id
        });
      }

      setNewMessage("");
      setReplyingTo(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editMessage = async () => {
    if (!editingMessage || !editMessageText.trim()) return;

    try {
      const { error } = await supabase
        .from("organization_chat")
        .update({
          message: editMessageText.trim(),
          edited_at: new Date().toISOString()
        })
        .eq("id", editingMessage.id);

      if (error) throw error;

      setEditingMessage(null);
      setEditMessageText("");
      toast({
        title: "Success",
        description: "Message updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("organization_chat")
        .update({ is_deleted: true, message: "[Deleted]" })
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("organization_chat_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction: emoji
        });

      if (error) throw error;
      setShowEmojiPicker(null);
    } catch (error: any) {
      if (error.code === '23505') { // Duplicate
        // Remove reaction
        await supabase
          .from("organization_chat_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUserId)
          .eq("reaction", emoji);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedOrgId || !currentUserId) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Create message with attachment
      const { data: newMsg, error: msgError } = await supabase
        .from("organization_chat")
        .insert({
          organization_id: selectedOrgId,
          user_id: currentUserId,
          message: file.name,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      await supabase.from("organization_chat_attachments").insert({
        message_id: newMsg.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      toast({
        title: "Success",
        description: "File uploaded",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const sendIdea = async () => {
    if (!newIdeaTitle.trim() || !selectedOrgId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("organization_ideas").insert({
        organization_id: selectedOrgId,
        user_id: user.id,
        title: newIdeaTitle.trim(),
        description: newIdeaDescription.trim() || null,
      });

      if (error) throw error;

      setNewIdeaTitle("");
      setNewIdeaDescription("");
      toast({
        title: "Success",
        description: "Idea posted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateIdea = async () => {
    if (!editingIdea || !editIdeaTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("organization_ideas")
        .update({
          title: editIdeaTitle.trim(),
          description: editIdeaDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingIdea.id);

      if (error) throw error;

      setEditingIdea(null);
      setEditIdeaTitle("");
      setEditIdeaDescription("");
      toast({
        title: "Success",
        description: "Idea updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteIdea = async (ideaId: string) => {
    try {
      const { error } = await supabase
        .from("organization_ideas")
        .delete()
        .eq("id", ideaId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Idea deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditIdea = (idea: Idea) => {
    setEditingIdea(idea);
    setEditIdeaTitle(idea.title);
    setEditIdeaDescription(idea.description || "");
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto p-6 pb-24">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Team</h1>
            <p className="text-muted-foreground">
              Collaboration, leaderboard, and team communication
            </p>
          </div>
        </div>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="ideas">
              <Lightbulb className="h-4 w-4 mr-2" />
              Ideas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Team Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/member/${member.id}`)}
                    >
                      <div className="w-8 text-center font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.position || "Team Member"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {member.completed_tasks}/{member.total_tasks} completed
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {member.total_tasks > 0
                            ? Math.round((member.completed_tasks / member.total_tasks) * 100)
                            : 0}% completion rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="flex flex-col h-[600px] bg-card rounded-lg border">
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-muted/30">
                    <CardTitle className="text-lg">Group Chat</CardTitle>
                  </div>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                    {chatMessages.map((msg) => {
                      const isOwnMessage = currentUserId === msg.user_id;
                      
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isOwnMessage && (
                            <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                              <AvatarImage src={msg.profiles.avatar_url || ""} />
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.profiles.first_name, msg.profiles.last_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {!isOwnMessage && (
                              <p className="text-xs font-medium text-primary px-2 mb-1">
                                {msg.profiles.first_name} {msg.profiles.last_name}
                              </p>
                            )}
                            
                            {/* Reply preview */}
                            {msg.reply_to && (
                              <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 border-l-2 border-primary">
                                <span className="font-medium">{msg.reply_to.profiles?.first_name}</span>: {msg.reply_to.message.substring(0, 50)}...
                              </div>
                            )}
                            
                            <div className="relative group">
                              <div className={`rounded-2xl px-4 py-2 ${
                                isOwnMessage 
                                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                  : 'bg-card border rounded-tl-sm'
                              }`}>
                                <p className="text-sm break-words">{msg.message}</p>
                                
                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {msg.attachments.map((att) => (
                                      <a 
                                        key={att.id}
                                        href={att.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-muted/50 rounded hover:bg-muted"
                                      >
                                        {att.file_type.startsWith('image/') ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                        <span className="text-xs">{att.file_name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                
                                {msg.edited_at && (
                                  <span className="text-xs opacity-70">(edited)</span>
                                )}
                              </div>
                              
                              {/* Message actions */}
                              {!msg.is_deleted && (
                                <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                  <div className="flex gap-1 bg-background border rounded-lg p-1 shadow-lg">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setReplyingTo(msg)}>
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowEmojiPicker(msg.id)}>
                                      <Smile className="h-3 w-3" />
                                    </Button>
                                    {isOwnMessage && (
                                      <>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingMessage(msg); setEditMessageText(msg.message); }}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteMessage(msg.id)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Emoji picker */}
                              {showEmojiPicker === msg.id && (
                                <div className="absolute z-10 bg-background border rounded-lg p-2 shadow-lg flex gap-1">
                                  {commonEmojis.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReaction(msg.id, emoji)}
                                      className="hover:scale-125 transition-transform text-lg"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {msg.reactions.map((reaction, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs cursor-pointer" onClick={() => addReaction(msg.id, reaction.reaction)}>
                                    {reaction.reaction} {reaction.count}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground px-2 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground">
                      Someone is typing...
                    </div>
                  )}
                  
                  {/* Reply preview */}
                  {replyingTo && (
                    <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Replying to:</span> {replyingTo.message.substring(0, 50)}...
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    </div>
                  )}
                  
                  {/* Input Area */}
                  <div className="p-4 border-t bg-background flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideas">
            <Card>
              <CardHeader>
                <CardTitle>Team Ideas & Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Input
                    placeholder="Idea title"
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Describe your idea..."
                    value={newIdeaDescription}
                    onChange={(e) => setNewIdeaDescription(e.target.value)}
                  />
                  <Button onClick={sendIdea} disabled={!newIdeaTitle.trim()}>
                    Post Idea
                  </Button>
                </div>

                <div className="space-y-4">
                  {ideas.map((idea) => (
                    <Card key={idea.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={idea.profiles.avatar_url || ""} />
                          <AvatarFallback>
                            {getInitials(idea.profiles.first_name, idea.profiles.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{idea.title}</p>
                              <p className="text-sm text-muted-foreground">
                                by {idea.profiles.first_name} {idea.profiles.last_name}
                              </p>
                            </div>
                            {idea.user_id === currentUserId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEditIdea(idea)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteIdea(idea.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {idea.description && (
                            <p className="text-sm mt-2">{idea.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(idea.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Message Dialog */}
        <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Message</DialogTitle>
            </DialogHeader>
            <Textarea
              value={editMessageText}
              onChange={(e) => setEditMessageText(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMessage(null)}>Cancel</Button>
              <Button onClick={editMessage}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Idea Dialog */}
        <Dialog open={!!editingIdea} onOpenChange={() => setEditingIdea(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editIdeaTitle}
                  onChange={(e) => setEditIdeaTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editIdeaDescription}
                  onChange={(e) => setEditIdeaDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingIdea(null)}>Cancel</Button>
              <Button onClick={updateIdea}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Team;