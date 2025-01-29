import { HttpException, Injectable } from '@nestjs/common';
import { CreateGraphDto } from './dto/create-graph.dto';
import { UpdateGraphDto } from './dto/update-graph.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Graph } from './entities/graph.entity';
import { Repository } from 'typeorm';
import { SourceDonneesService } from 'src/source_donnees/source_donnees.service';

@Injectable()
export class GraphService {

  constructor(
      @InjectRepository(Graph)
      private graphRepository : Repository<Graph>,
      private sourceDonneesservice :  SourceDonneesService
  
   
  )
  {}


  async create(createGraphDto: CreateGraphDto,idsource:string): Promise<Graph> {
    const source = await this.sourceDonneesservice.getSourceById(idsource);
    if (!source) throw new HttpException("Source de données introuvable.",700);

    const newGraph = this.graphRepository.create({
      ...createGraphDto,
      // allo:source.nomSource,
      sources: source,
    });
    return await this.graphRepository.save(newGraph);
  }

  
  async findAll(): Promise<Graph[]> {
    return await this.graphRepository.find({ relations: ["source_donnees"] });
  }

  
  async findOne(id: string): Promise<Graph> {
    const graph = await this.graphRepository.findOne({
      where: { idgraph: id },
      relations: ["source_donnees"],
    });
    if (!graph) throw new HttpException(`Graphique avec l'ID ${id} introuvable.`,705);
    return graph;
  }


  async update(id: string, updateGraphDto: UpdateGraphDto): Promise<Graph> {
    const graph = await this.findOne(id);
    Object.assign(graph, updateGraphDto);
    return await this.graphRepository.save(graph);
  }

  
  async remove(id: string): Promise<void> {
    const graph = await this.findOne(id);
    await this.graphRepository.remove(graph);
  }

  
}
