import { Controller, Get, Post, Body, Param, Patch, Delete } from "@nestjs/common";
import { GraphService } from "./graph.service";
import { CreateGraphDto } from "./dto/create-graph.dto";
import { UpdateGraphDto } from "./dto/update-graph.dto";

@Controller("graph")
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post("add/:idsource")
  create(
    @Body() createGraphDto: CreateGraphDto,
    @Param('idsource') idsource:string
  
  ) {
    return this.graphService.create(createGraphDto,idsource);
  }

  @Get("all")
  findAll() {
    return this.graphService.findAll();
  }

  @Get("getone/:id")
  findOne(@Param("id") id: string) {
    return this.graphService.findOne(id);
  }

  @Patch("update/:id")
  update(@Param("id") id: string, @Body() updateGraphDto: UpdateGraphDto) {
    return this.graphService.update(id, updateGraphDto);
  }

  @Delete("delete/:id")
  remove(@Param("id") id: string) {
    return this.graphService.softDelete(id);
  }

  @Get('graphbysource/:idsource')
async getBySource(@Param('idsource') idsource: string) {
  return this.graphService.findBySource(idsource);
}

@Get('graphByproject/:idprojet')
async getGraphTitlesByProject(@Param('idprojet') idprojet: string) {
  return this.graphService.getGraphTitlesByProject(idprojet);
}

@Get('graphbyNameAndProject/:name/:projectId')
async getGraphByNameAndProject(@Param('name') name: string, @Param('projectId') projectId: string) {
    return this.graphService.findByNameAndProject(name, projectId);
}


@Get('/count/:idprojet')
  async getTotalGraphs(@Param('idprojet') idprojet: string) {
    return { totalGraphs: await this.graphService.getTotalGraphsByProject(idprojet) };
  }

}
