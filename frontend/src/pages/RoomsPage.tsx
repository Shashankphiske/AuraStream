import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../services/roomService';
import { friendService } from '../services/friendService';
import { useRoomStore } from '../store/useRoomStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { IRoom, IFriendUser } from '../types';
import { useNavigate } from 'react-router-dom';
import { CreateRoomModal } from '../components/room/CreateRoomModal';
import { Button } from '../components/common/Button';
import {
  Radio,
  Users,
  Plus,
  ArrowRight,
  UserPlus,
  Check,
  X,
  Volume2,
  Lock,
  Globe,
  Search,
  UserCheck,
} from 'lucide-react';

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const { setRoom } = useRoomStore();

  const [activeTab, setActiveTab] = useState<'rooms' | 'friends'>('rooms');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendReqSuccess, setFriendReqSuccess] = useState('');
  const [friendReqLoading, setFriendReqLoading] = useState(false);

  // Fetch Rooms
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<IRoom[]>({
    queryKey: ['rooms-list'],
    queryFn: () => roomService.getRooms(),
    refetchInterval: 5000,
  });

  // Fetch Friends
  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends-list'],
    queryFn: () => friendService.getFriends(),
    enabled: isAuthenticated,
  });

  // Handle Quick Join with Code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const roomDetails = await roomService.getRoom(cleanCode);
      if (roomDetails && roomDetails.room) {
        setRoom(roomDetails.room, roomDetails.members, roomDetails.queue, roomDetails.messages);
        navigate(`/room/${cleanCode}`);
      } else {
        setCodeError('Room not found. Check the code and try again.');
      }
    } catch {
      setCodeError('Room not found or session has ended.');
    }
  };

  // Join a Room from the Grid
  const handleJoinRoom = async (room: any) => {
    try {
      const roomDetails = await roomService.getRoom(room.id || room.code);
      setRoom(roomDetails.room, roomDetails.members, roomDetails.queue, roomDetails.messages);
      navigate(`/room/${room.code}`);
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  // Send Friend Request
  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendSearchQuery.trim()) return;

    setFriendReqLoading(true);
    setFriendReqSuccess('');
    try {
      await friendService.sendRequest(friendSearchQuery.trim());
      setFriendReqSuccess('Friend request sent!');
      setFriendSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send request');
    } finally {
      setFriendReqLoading(false);
    }
  };

  // Accept / Decline Request
  const handleFriendResponse = async (friendshipId: string, action: 'accept' | 'decline') => {
    try {
      await friendService.respond(friendshipId, action);
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
    } catch (err) {
      console.error('Failed to update friend request:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 relative">
      {/* Mobile Floating Host Room Action Button (FAB) */}
      <button
        onClick={() => {
          if (!isAuthenticated) {
            openModal('login');
            return;
          }
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-24 right-4 z-40 md:hidden flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white font-bold text-xs shadow-2xl shadow-rose-500/60 hover:scale-105 active:scale-95 transition-all border border-white/30 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-300"
        title="Host a Session"
      >
        <Plus className="w-4 h-4 text-white" />
        <span className="tracking-wide">Host Room</span>
      </button>

      {/* 1. Hero Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/40 via-zinc-900/90 to-purple-950/30 border border-rose-500/25 p-5 md:p-8 shadow-2xl">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Live Streaming Rooms</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                • Synchronized Music & Voice
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading leading-tight">
              Listen Together in Real-Time Sync
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Host your own listening room, invite your circle, queue songs collaboratively, or join public sessions with live chat.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openModal('login');
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Host a Room</span>
            </button>

            {/* Quick Code Join Form */}
            <form onSubmit={handleJoinByCode} className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="ROOM CODE"
                maxLength={10}
                className="w-28 sm:w-32 px-3 py-2 bg-transparent text-white placeholder-zinc-500 text-xs uppercase font-mono tracking-widest outline-none text-center"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {codeError && (
          <p className="text-xs text-rose-400 mt-3 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl self-start inline-block">
            ⚠️ {codeError}
          </p>
        )}
      </div>

      {/* 2. Navigation Tab Selector */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-zinc-850">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Sessions</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'rooms' ? 'bg-black/15 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              {rooms.length}
            </span>
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                openModal('login');
                return;
              }
              setActiveTab('friends');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
            {friendsData?.pendingIncoming && friendsData.pendingIncoming.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              openModal('login');
              return;
            }
            setIsCreateModalOpen(true);
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* TAB 1: LIVE ROOMS */}
      {activeTab === 'rooms' && (
        <div className="space-y-8">
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Create Room Card */}
            <div className="md:col-span-6 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-850 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Host a Session</h3>
                <p className="text-xs text-zinc-400">
                  Start an AuraRoom, invite your circle or stream to the community with real-time sync.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (!isAuthenticated) {
                    openModal('login');
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Create Room</span>
              </Button>
            </div>

            {/* Join via Code Card */}
            <div className="md:col-span-6 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-850 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Join with Room Code</h3>
                <p className="text-xs text-zinc-400">
                  Got an invite code from a friend? Enter it below to jump directly into their stream.
                </p>
              </div>

              <form onSubmit={handleJoinByCode} className="flex gap-2">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="e.g. AURA01"
                  maxLength={10}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs uppercase font-mono tracking-wider outline-none focus:border-zinc-500 transition-colors"
                />
                <Button variant="secondary" size="md" type="submit" className="flex items-center gap-1">
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </form>
              {codeError && <p className="text-[11px] text-rose-400">{codeError}</p>}
            </div>
          </div>

          {/* Active Rooms Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Active Rooms</h3>
                <span className="text-xs text-zinc-500">{rooms.length} live session{rooms.length !== 1 ? 's' : ''}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!isAuthenticated) {
                    openModal('login');
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-1.5 md:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </Button>
            </div>

            {roomsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 rounded-2xl bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-zinc-850 bg-zinc-900/20 space-y-3">
                <Radio className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                <h4 className="text-sm font-semibold text-zinc-300">No active rooms right now</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Be the first to start a session! Launch a room and invite your friends to listen together.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openModal('login');
                      return;
                    }
                    setIsCreateModalOpen(true);
                  }}
                >
                  Create First Room
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room: IRoom) => (
                  <div
                    key={room.id}
                    onClick={() => handleJoinRoom(room)}
                    className="group p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-850/60 border border-zinc-850 hover:border-zinc-700/80 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-mono uppercase font-semibold text-zinc-400">
                            {room.code}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <Users className="w-3 h-3" />
                          <span>{room.member_count || 1}</span>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-white line-clamp-1">
                        {room.name}
                      </h4>
                      {room.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{room.description}</p>
                      )}
                    </div>

                    {/* Currently Playing Card */}
                    <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
                      <img
                        src={room.track_thumbnail || 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg'}
                        alt={room.track_title || 'Now Playing'}
                        className="w-10 h-10 rounded-lg object-cover bg-zinc-900 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {room.track_title || 'No active track'}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {room.track_artist || 'Host setting up'}
                        </p>
                      </div>
                      <div className="flex items-end gap-0.5 h-3.5 pr-1" title="Playing">
                        <div className="wave-bar" />
                        <div className="wave-bar" />
                        <div className="wave-bar" />
                      </div>
                    </div>

                    {/* Footer Host Info & Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center overflow-hidden">
                          {room.host_avatar ? (
                            <img src={room.host_avatar} alt={room.host_name} className="w-full h-full object-cover" />
                          ) : (
                            room.host_name?.charAt(0) || 'H'
                          )}
                        </div>
                        <span className="text-xs text-zinc-400 truncate max-w-[120px]">
                          {room.host_name}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white flex items-center gap-1">
                        <span>Join</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FRIENDS & SOCIAL */}
      {activeTab === 'friends' && (
        <div className="space-y-8">
          {/* Add Friend Search Input */}
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-850 space-y-3">
            <h3 className="text-sm font-bold text-white">Find & Add Friends</h3>
            <p className="text-xs text-zinc-400">
              Enter an AuraStream username or email address to send a friend request.
            </p>

            <form onSubmit={handleSendFriendRequest} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                placeholder="friend@email.com or username"
                className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs outline-none focus:border-zinc-500 transition-colors"
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={friendReqLoading}
                className="flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </Button>
            </form>
            {friendReqSuccess && <p className="text-xs text-emerald-400 font-medium">{friendReqSuccess}</p>}
          </div>

          {/* Pending Incoming Requests */}
          {friendsData?.pendingIncoming && friendsData.pendingIncoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Pending Requests ({friendsData.pendingIncoming.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {friendsData.pendingIncoming.map((req: any) => (
                  <div
                    key={req.friendship_id}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center overflow-hidden">
                        {req.avatar ? (
                          <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" />
                        ) : (
                          req.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{req.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{req.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleFriendResponse(req.friendship_id, 'accept')}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        title="Accept"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFriendResponse(req.friendship_id, 'decline')}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Your Friends</h3>
              <span className="text-xs text-zinc-500">
                {friendsData?.friends?.length || 0} connection{friendsData?.friends?.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!friendsData?.friends || friendsData.friends.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-zinc-850 bg-zinc-900/20 space-y-2">
                <Users className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                <h4 className="text-sm font-semibold text-zinc-300">No friends added yet</h4>
                <p className="text-xs text-zinc-500">
                  Search above to connect with friends and invite them to your listening rooms.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {friendsData.friends.map((friend: IFriendUser) => (
                  <div
                    key={friend.id}
                    className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="relative w-9 h-9 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                        ) : (
                          friend.name.charAt(0).toUpperCase()
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{friend.name}</p>
                        {friend.now_playing ? (
                          <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-zinc-500" />
                            <span>{friend.now_playing}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-500">Online</p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreateModalOpen(true);
                      }}
                      className="text-xs text-zinc-300 hover:text-white"
                    >
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
