import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Group } from '../types';

class GroupsService {
  private collectionName = 'groups';

  async getAllGroups(): Promise<Group[]> {
    try {
      const q = query(
        collection(db!, this.collectionName),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Group;
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  }

  async getActiveGroups(): Promise<Group[]> {
    try {
      const q = query(
        collection(db!, this.collectionName),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Group;
      });
    } catch (error) {
      console.error('Error fetching active groups:', error);
      throw error;
    }
  }

  async getGroupById(groupId: string): Promise<Group | null> {
    try {
      const docRef = doc(db!, this.collectionName, groupId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Group;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  async getGroupsByType(type: 'class' | 'event' | 'custom'): Promise<Group[]> {
    try {
      const q = query(
        collection(db!, this.collectionName),
        where('type', '==', type),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Group;
      });
    } catch (error) {
      console.error('Error fetching groups by type:', error);
      throw error;
    }
  }

  async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Timestamp.now();
      
      // Filter out undefined values to avoid Firestore errors
      const cleanData: any = {
        name: groupData.name,
        type: groupData.type,
        memberIds: groupData.memberIds,
        isActive: groupData.isActive,
        createdBy: groupData.createdBy,
        createdByName: groupData.createdByName,
        createdAt: now,
        updatedAt: now,
      };
      
      // Only add optional fields if they have values
      if (groupData.description) cleanData.description = groupData.description;
      if (groupData.classLevel) cleanData.classLevel = groupData.classLevel;
      if (groupData.classType) cleanData.classType = groupData.classType;
      if (groupData.eventId) cleanData.eventId = groupData.eventId;
      
      const docRef = await addDoc(collection(db!, this.collectionName), cleanData);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async updateGroup(groupId: string, updates: Partial<Omit<Group, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>>): Promise<void> {
    try {
      const docRef = doc(db!, this.collectionName, groupId);
      
      // Filter out undefined values to avoid Firestore errors
      const cleanUpdates: any = {
        updatedAt: Timestamp.now(),
      };
      
      // Only add fields that are defined
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.description !== undefined) cleanUpdates.description = updates.description;
      if (updates.type !== undefined) cleanUpdates.type = updates.type;
      if (updates.memberIds !== undefined) cleanUpdates.memberIds = updates.memberIds;
      if (updates.classLevel !== undefined) cleanUpdates.classLevel = updates.classLevel;
      if (updates.classType !== undefined) cleanUpdates.classType = updates.classType;
      if (updates.eventId !== undefined) cleanUpdates.eventId = updates.eventId;
      if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;
      
      await updateDoc(docRef, cleanUpdates);
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    try {
      const docRef = doc(db!, this.collectionName, groupId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  async addMembersToGroup(groupId: string, memberIds: string[]): Promise<void> {
    try {
      const group = await this.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const updatedMemberIds = [...new Set([...group.memberIds, ...memberIds])];
      await this.updateGroup(groupId, { memberIds: updatedMemberIds });
    } catch (error) {
      console.error('Error adding members to group:', error);
      throw error;
    }
  }

  async removeMembersFromGroup(groupId: string, memberIds: string[]): Promise<void> {
    try {
      const group = await this.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const updatedMemberIds = group.memberIds.filter(id => !memberIds.includes(id));
      await this.updateGroup(groupId, { memberIds: updatedMemberIds });
    } catch (error) {
      console.error('Error removing members from group:', error);
      throw error;
    }
  }

  async toggleGroupStatus(groupId: string): Promise<void> {
    try {
      const group = await this.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      await this.updateGroup(groupId, { isActive: !group.isActive });
    } catch (error) {
      console.error('Error toggling group status:', error);
      throw error;
    }
  }
}

export const groupsService = new GroupsService();
